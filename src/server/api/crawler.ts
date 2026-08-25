/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

import { Prisma, type Movie } from "~/../prisma/generated/prisma/client";
import { load } from "cheerio";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { env } from "~/env";
import { db } from "~/server/db";
import { RateLimiter } from "./rate-limiter";

dayjs.extend(minMax);
dayjs.extend(customParseFormat);

// Create a rate limiter instance: 45 requests per second = 45 tokens per 1000ms = 0.045 tokens per ms
const tmdbRateLimiter = new RateLimiter(45, 0.045);

type Screening = {
  movieTitle: string;
  startTime: Date;
  properties: string[];
  cinemaId: number;
  releaseYear?: number;
  releaseDate?: Date;
  length?: number;
  tmdbId?: number;
}

const tmdbBacklistTitles = [
  "English Version - Sneak Preview",
  "SNEAK-Preview mit Prosecco und Brezel",
  "Speakeasy Cinema",
  "All In Sneak Preview",
  "Sneak Preview",
  "Sneak",
  "Sneak OV",
  "OV-Sneak",
  "OV SNEAK Preview",
  "Open Archive"
].map(t => t.toLowerCase());

const select = { id: true, tmdbId: true, updatedAt: true, popularity: true, releaseDate: true, backdropUrl: true, searchTitles: true };

async function setMovieTmdbId(movieId: number, tmdbId: number | null) {
  if (tmdbId === null) {
    await db.movie.update({
      where: { id: movieId },
      data: { tmdbId: null }
    });
    return true;
  }

  const existing = await db.movie.findUnique({
    where: { tmdbId },
    select: { id: true }
  });
  if (existing && existing.id !== movieId) {
    return false;
  }

  try {
    await db.movie.update({
      where: { id: movieId },
      data: { tmdbId }
    });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return false;
    }
    throw e;
  }
}

export async function run() {
  console.log("Running crawlers...");
  const screenings = (await Promise.all([
    crawlSchauburg(),
    crawlKinemathek(),
    crawlUniversum(),
    crawlFilmpalast()
  ])).flat() as Screening[];

  const movies: Movie[] = [];

  const uniqueMovies = new Set<string>();
  const movieDetails = new Map<string, { length?: number, releaseDate?: Date, releaseYear?: number }>();
  // titles for which a crawler already knows the TMDB id
  const knownTmdbIds = new Map<string, number>();
  screenings.forEach(s => {
    uniqueMovies.add(s.movieTitle);
    if (s.tmdbId) {
      knownTmdbIds.set(s.movieTitle, s.tmdbId);
    }
    const details = movieDetails.get(s.movieTitle);
    if (!details?.length || !details.releaseDate || !details.releaseYear) {
      movieDetails.set(s.movieTitle, {
        length: details?.length ?? s.length,
        releaseDate: details?.releaseDate ?? s.releaseDate,
        releaseYear: details?.releaseYear ?? s.releaseYear
      });
    }
  });

  const toUpdate: Promise<void | Movie>[] = [];

  // assign tmdbId to searchTitles either from existing movies or TMDB API
  const found = await Promise.all(Array.from(uniqueMovies).map(async m => {
    const knownTmdbId = knownTmdbIds.get(m);
    const segments = m.split("-");
    const prop = /\(([^)]*)\)/.exec(m)?.[1]?.trim();
    let movie;
    let searchTitle: string | null = null;
    let extraProperties: string[] = [];
    let tmdbId: number | null | undefined;

    if (knownTmdbId) {
      // the crawler knows the exact movie, so the title doesn't have to be resolved
      tmdbId = knownTmdbId;
      searchTitle = m;
      movie = await db.movie.findUnique({ where: { tmdbId: knownTmdbId }, select });
      if (movie && !movie.searchTitles.includes(m)) {
        toUpdate.push(db.movie.update({ where: { id: movie.id }, data: { searchTitles: { push: m } } }));
      }
    } else {
      do {
        const rawTitle = segments.join("-").trim();
        const queryTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, "");

        movie = await db.movie.findFirst({
          where: { searchTitles: { hasSome: [queryTitle, rawTitle] } },
          select
        });
        if (!movie) {
          const extraProp = segments.pop()?.trim();
          if (extraProp) {
            // console.log(`Title ${queryTitle} not found in DB. Add extra prop: ${extraProp}`);
            extraProperties.push(extraProp);
          }
        } else {
          // console.log(`Found movie for ${queryTitle}. Id: ${movie.id} Title: ${movie.title} searchTitles: ${movie.searchTitles.join(", ")}`);
          searchTitle = queryTitle;
        }
      } while (!movie && segments.length > 0);

      if (!movie) {
        extraProperties.pop();
        const segs = m.split("-").map(s => s.replace(/\s*\([^)]*\)\s*$/, "").trim());
        if (segs.length > 1) {
          segs.pop();
          searchTitle = segs.join(" - ");
        } else {
          searchTitle = m;
        }
      }

      tmdbId = movie?.tmdbId;
      if (movie === null && !tmdbBacklistTitles.some(t => m.toLowerCase().startsWith(t))) {
        let toPush: Promise<Movie> | null = null;
        ({ searchTitle, tmdbId, movie, toPush } = await getMovieDetails(m.replace(/\s*(OV|OmU|OmeU)$/i, ""), searchTitle, tmdbId));
        if (toPush) {
          toUpdate.push(toPush);
        }
      }
      // if no movie was found on tmdb extraProps contains all segments of title. remove them.
      if (!tmdbId) {
        // console.log(`No TMDB found for ${m}. Remove extra props.`);
        extraProperties = [];
      }
      if (prop) {
        // console.log(`Add property in brackets: ${prop}`);
        extraProperties.push(prop);
      }
      extraProperties.reverse();
    }

    if (movie) {
      // if movie metadata is not present or old, update it
      if (!!movie.tmdbId && (movie.updatedAt < dayjs().subtract(5, "days").toDate() || !movie.popularity || !movie.releaseDate || !movie.backdropUrl)) {
        toUpdate.push((async (tmdbId: number) => {
          const details = await getDetails(tmdbId).catch(e => {
            console.error(`Error getting details for ${tmdbId}: ${e instanceof Error ? e.message : String(e)}`);
            return undefined;
          });
          if (details) {
            await db.movie.update({
              where: { id: movie.id },
              data: { popularity: details.popularity, releaseDate: details.releaseDate, backdropUrl: details.backdropUrl }
            });
          } else {
            const { movie: foundMovie, toPush } = await getMovieDetails(m, searchTitle, tmdbId);
            if (toPush) {
              toUpdate.push(toPush);
            }
            if (foundMovie) {
              // if no movie with this tmdbId was found, update existing, if some exist take that
              const hasUpdatedTmdbId = await setMovieTmdbId(movie.id, foundMovie.tmdbId);
              if (hasUpdatedTmdbId) {
                movie.tmdbId = foundMovie.tmdbId;
              }
            } else {
              await setMovieTmdbId(movie.id, null);
              movie.tmdbId = null;
            }
          }
        })(movie.tmdbId));
      }
    }
    return { orgTitle: m, searchTitle: searchTitle!, tmdbId, movieId: movie?.id, extraProperties };
  }));

  // init movieIds with existing movies
  const movieIds = new Map<string, number>(found
    .filter(({ movieId }) => !!movieId)
    .map(({ orgTitle, movieId }) => [orgTitle, movieId!]));

  const extraProperties = new Map<string, string[]>(found
    .filter(({ extraProperties }) => extraProperties.length > 0)
    .map(({ orgTitle, extraProperties }) => [orgTitle, extraProperties]));


  // group new movies with tmdbId by tmdbId
  const searchTitles = found.filter(({ movieId, tmdbId }) => !movieId && !!tmdbId).reduce((acc, { orgTitle, searchTitle, tmdbId }) => {
    if (!tmdbId) {
      return acc;
    };
    if (!acc.has(tmdbId)) {
      acc.set(tmdbId, { searchTitles: [], orgTitles: [] });
    };
    acc.get(tmdbId)!.searchTitles.push(searchTitle);
    acc.get(tmdbId)!.orgTitles.push(orgTitle);
    return acc;
  }, new Map<number, { searchTitles: string[], orgTitles: string[] }>());

  // put new movies into db
  await Promise.all(Array.from(searchTitles.entries()).map(async ([tmdbId, { searchTitles, orgTitles }]) => {
    const details = await getDetails(tmdbId).catch(e => {
      console.error(`Error getting details for ${tmdbId}: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    });
    if (!details) {
      const movie = found.find(e => e.tmdbId === tmdbId);
      if (movie) {
        movie.tmdbId = undefined;
      }
      return;
    }
    const existingMovie = await db.movie.findUnique({
      where: { tmdbId },
      select
    });
    const movie = existingMovie
      ? await db.movie.update({
        where: { id: existingMovie.id },
        data: {
          ...details,
          searchTitles: Array.from(new Set([...existingMovie.searchTitles, ...searchTitles]))
        }
      })
      : await db.movie.create({
        data: { ...details, searchTitles }
      });
    movies.push(movie);
    orgTitles.forEach(st => movieIds.set(st, movie.id));
  }));

  // create all movies not found on tmdb
  found.filter(({ tmdbId, movieId }) => !tmdbId && !movieId).map(async e => {
    const details = movieDetails.get(e.orgTitle)!;
    let releaseDate: Date | undefined = undefined;
    if (details.releaseDate) {
      releaseDate = dayjs(details.releaseDate).toDate();
    } else if (details.releaseYear) {
      const now = dayjs();
      releaseDate = details.releaseYear < now.year() ? dayjs(`${details.releaseYear}-01-01Z`).toDate() : now.toDate();
    }
    const movie = await db.movie.create({
      data: {
        title: e.searchTitle,
        searchTitles: [e.searchTitle],
        length: !!details.length && details.length > 0 ? details.length : Prisma.skip,
        releaseDate: releaseDate ?? Prisma.skip
      }
    });
    movies.push(movie);
    movieIds.set(e.orgTitle, movie.id);
  }).forEach(p => toUpdate.push(p));

  await Promise.all(toUpdate);

  const insertedScreenings = await db.screening.createManyAndReturn({
    data: screenings.map(s => ({
      movieId: movieIds.get(s.movieTitle)!,
      startTime: s.startTime,
      properties: Array.from(new Set([...s.properties, ...(extraProperties.get(s.movieTitle) ?? [])])),
      cinemaId: s.cinemaId
    }))
  });

  console.log("Crawlers finished.")

  return { screenings: insertedScreenings, movies };
}

type MovieDetails = {
  id: number,
  poster_path: string,
  backdrop_path: string,
  title: string,
  original_title: string,
  release_date: string
  runtime: number,
  popularity: number,
  release_dates: {
    results: {
      iso_3166_1: string,
      release_dates: { type: number, release_date: string }[]
    }[]
  }
}

async function getMovieDetails(
  m: string,
  searchTitle: string | null,
  tmdbId: number | null | undefined) {
  const segments = m.split("-");
  let movie: Pick<Movie, "id" | "tmdbId" | "updatedAt" | "popularity" | "releaseDate" | "backdropUrl" | "searchTitles"> | null = null;
  let toPush: Promise<Movie> | null = null;
  while (segments.length > 0) {
    const rawTitle = segments.join("-").trim();
    const queryTitle = rawTitle.replace(/\s*\([^)]*\)\s*$/, "");
    const result = await searchMovie(queryTitle).catch(e => {
      console.error(`Error searching for ${queryTitle}: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    });
    if (result) {
      // console.log(`Found TMDB for queryTitle: ${queryTitle}`);
      searchTitle = queryTitle;
      tmdbId = result.id;
      movie = await db.movie.findUnique({ where: { tmdbId }, select });
      if (movie && !movie.searchTitles.includes(queryTitle)) {
        // if movie exists in db add searchTitle to it
        toPush = db.movie.update({ where: { id: movie?.id }, data: { searchTitles: { push: queryTitle } } });
      }
      break;
    } else {
      segments.pop();
    }
  }
  return { searchTitle, tmdbId, movie, toPush };
}

async function getDetails(id: number) {
  const response = await getTMDB(`https://api.themoviedb.org/3/movie/${id}?language=de-DE&append_to_response=release_dates`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Fetching TMDB details for ${id} failed with status: ${response.status}`);
  }
  const data = await response.json() as MovieDetails;
  const releaseDateForDe = data?.release_dates?.results?.find(e => e.iso_3166_1.toLowerCase() === "de")?.release_dates;

  let releaseDate: dayjs.Dayjs | null = null;
  if (releaseDateForDe && releaseDateForDe.length > 0) {
    // 3 === Theatrical
    const theatricalRelease = releaseDateForDe.find(e => e.type === 3)?.release_date;
    if (theatricalRelease) {
      releaseDate = dayjs(theatricalRelease);
    } else {
      releaseDate = dayjs.min(releaseDateForDe.map(e => dayjs(e.release_date)));
    }
  }

  releaseDate ??= data.release_date ? dayjs(data.release_date + " 00:00") : null;

  return {
    tmdbId: data.id,
    title: data.title ?? data.original_title,
    posterUrl: data.poster_path,
    backdropUrl: data.backdrop_path,
    length: data.runtime,
    popularity: data.popularity,
    releaseDate: releaseDate ? releaseDate.toDate() : null
  };
}

async function searchMovie(title: string) {
  const response = await getTMDB(`https://api.themoviedb.org/3/search/movie?query=${title}&include_adult=true&language=de-DE`);

  if (response.ok) {
    const data = await response.json() as { results: { poster_path: string, id: number, popularity: number }[] };
    return data?.results?.[0];
  } else if (response.status !== 404) {
    throw new Error(`Fetching TMDB search for ${title} failed with status: ${response.status}`);
  }
}

async function deleteOldScreenings(screenings: Screening[], cinemaId: number) {
  if (screenings.length > 0) {
    const from = dayjs.min(screenings.map(s => dayjs(s.startTime)))!.toDate();
    const to = dayjs.max(screenings.map(s => dayjs(s.startTime)))!.toDate();
    console.log(`Deleting ${screenings.length} screenings from ${from.toISOString()} to ${to.toISOString()} for cinema #${cinemaId}...`);
    // Delete existing screenings
    await db.screening.deleteMany({
      where: {
        startTime: {
          gte: from,
          lte: to
        },
        cinemaId
      }
    });
  }
}

async function crawlSchauburg() {
  try {
    const body = new FormData();
    body.set("tx_moviemanagement_movieplan[date]", dayjs().format("YYYY-MM-DD") + " - " + dayjs().add(1, "month").format("YYYY-MM-DD"));
    const response = await fetch("https://www.schauburg.de/spielplan/filter", {
      method: "POST",
      body
    });
    const textResponse = await response.text();
    const $ = load(textResponse);

    let link = $('#load-more-events').first().attr('data-ajax-url');

    while (link) {
      const res = await fetch('https://www.schauburg.de' + link);
      const textResponse = await res.text();
      link = load(textResponse)('#load-more-events').first().attr('data-ajax-url');
      $('body').append(textResponse);
    }

    if (!response.ok) {
      throw new Error(`Fetching Schauburg failed with status: ${response.status}`);
    }

    const screenings: Screening[] = [];

    // Find cinema ID for Schauburg
    const { id: cinemaId } = await db.cinema.findFirstOrThrow({
      select: {
        id: true
      },
      where: {
        name: "Schauburg"
      }
    });

    let lastMonth = -1;
    let nextYear = false;

    // Process each date section
    $(".schauburg-previewelement-date").each((_, dateElement) => {
      const $dateElement = $(dateElement);

      // Skip mobile version (d-lg-none) and only process desktop version (d-lg-flex d-none)
      if (!$dateElement.hasClass("d-lg-flex") || !$dateElement.hasClass("d-none")) {
        return;
      }

      // Extract date parts from the date element
      const dayNumber = $dateElement.find("span.number").text().trim();
      const month = $dateElement.contents().last().text().trim();

      if (!dayNumber || !month) return;

      // Convert German month name to number
      const monthNum = getGermanMonthNumber(month);
      if (monthNum === -1) return;

      if (monthNum < lastMonth) {
        nextYear = true;
      }
      lastMonth = monthNum;

      // Determine year (assume current year, or next year if month is before current month)
      const now = new Date();
      let year = now.getFullYear();
      if (nextYear) {
        year++;
      }

      // Find the collapse section that follows this date
      const collapseId = $dateElement.parent().next().attr("id");
      if (!collapseId) return;

      const collapseSection = $(`#${collapseId}`);

      // Process each screening in this date section
      collapseSection.find(".schauburg-previewelement.row").each((_, screeningElement) => {
        const $screening = $(screeningElement);

        // Extract time from desktop version (d-none d-lg-flex) time element
        const timeElement = $screening.find(".schauburg-previewelement-time").first();
        const timeText = timeElement.text().trim();
        if (!timeText) return;

        // Parse time (format: "19.00" or "19.30")
        const timeParts = timeText.split(".").map(n => parseInt(n));
        const hours = timeParts[0];
        const minutes = timeParts[1];
        if (timeParts.length !== 2 || isNaN(hours!) || isNaN(minutes!)) return;

        // Extract movie title
        let movieTitle = $screening.find(".schauburg-previewelement-title").text().trim();
        if (!movieTitle) return;

        // Extract properties
        const properties: string[] = [];

        // Extract overTitelText (special events, festivals, etc.)
        const overTitleText = $screening.find(".schauburg-previewelement-overTitelText").text().trim();
        if (overTitleText) {
          properties.push(overTitleText);
        }

        // Extract category information (contains language, length, FSK)
        const categoryText = $screening.find(".schauburg-previewelement-category").text().trim();
        let length: number | undefined;

        if (categoryText) {
          // Split by | and extract relevant parts
          const categoryParts = categoryText.split("|").map(p => p.trim());

          categoryParts.forEach(part => {
            // Extract length (e.g., "136 MIN")
            const lengthMatch = /(\d+)\s*MIN/i.exec(part);
            if (lengthMatch) {
              length = parseInt(lengthMatch[1]!);
              return
            }

            if (part !== "DE" && !part.startsWith("FSK")) {
              properties.push(part);
            }
          });
        }

        if (properties.find(p => p.startsWith("Frühstückskino")) !== undefined) {
          if (movieTitle.startsWith("Frühstück -")) {
            movieTitle = movieTitle.substring("Frühstück -".length).trim();
          }
        }

        // Create date object
        const startTime = new Date(year, monthNum - 1, parseInt(dayNumber), hours, minutes);

        screenings.push({
          movieTitle,
          startTime,
          properties: transformProperties(properties),
          cinemaId,
          length: length && length > 0 ? length : undefined
        });
      });
    });

    console.log(`Found ${screenings.length} screenings in Schauburg.`);

    await deleteOldScreenings(screenings, cinemaId);

    return screenings;
  } catch (error) {
    console.error(`Error crawling Schauburg: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// Helper function to convert German month names to numbers
function getGermanMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    "Jan": 1,
    "Feb": 2,
    "Mär": 3,
    "Apr": 4,
    "Mai": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Okt": 10,
    "Nov": 11,
    "Dez": 12
  };
  return months[monthName] ?? -1;
}

function transformProperties(properties: string[]) {
  return Array.from(new Set(properties.map(p => {
    let result = p;
    switch (p) {
      case "Englisches Original mit deutschen Untertiteln":
      case "Originalfassung mit deutschen Untertiteln":
      case "Originalfassung mit dt. Untertitel":
      case "im engl. Original mit dt. Untertiteln":
      case "engl. OmU":
      case "omu":
        result = "OmU";
        break;
      case "englisches OV, ohne Untertitel":
      case "englische OV, ohne Untertitel":
      case "Englische Originalfassung":
      case "Originalfassung":
      case "englisch":
      case "ov":
        result = "OV";
        break;
      case "Englisches Original mit engl. Untertiteln":
      case "Mit englischen Untertiteln":
      case "omeu":
        result = "OmeU";
        break;
      case "3d":
        result = "3D";
        break;
      case "2d":
        result = "2D";
        break;
      case "dbox":
        result = "D-BOX";
        break;
    }
    return result;
  })));
}

async function crawlKinemathek() {
  try {
    // Program lives on the homepage after the 2026 site relaunch (old /spielplan/ is gone)
    const response = await fetch("https://kinemathek-karlsruhe.de/");
    if (!response.ok) {
      throw new Error(`Fetching Kinemathek failed with status: ${response.status}`);
    }
    const html = await response.text();
    const $ = load(html);

    const screenings: Screening[] = [];

    const { id: cinemaId } = await db.cinema.findFirstOrThrow({
      select: {
        id: true
      },
      where: {
        name: "Kinemathek"
      }
    });

    $("#program article.event").each((_, eventEl) => {
      const event = $(eventEl);
      const dateStr = event.closest("section.day").attr("data-date");
      if (!dateStr) return;

      const timeText = event.find(".time").first().text().replace(/\s+/g, "");
      const timeMatch = /^(\d{1,2})(\d{2})$/.exec(timeText);
      if (!timeMatch) return;
      const hours = parseInt(timeMatch[1]!, 10);
      const minutes = parseInt(timeMatch[2]!, 10);

      const movieTitle = event.find(".t-text").first().text().trim();
      if (!movieTitle) return;

      // Credits look like "Susanne Kim, DE/KR 2026; 89′" (year/length optional)
      const credits = event.find(".credits").first().clone().children().remove().end().text().replace(/\s+/g, " ").trim();
      const yearMatch = /\b((?:19|20)\d{2})\b/.exec(credits);
      const lengthMatch = /(\d+)\s*[′']/.exec(credits);
      const releaseYear = yearMatch ? parseInt(yearMatch[1]!, 10) : undefined;
      const length = lengthMatch ? parseInt(lengthMatch[1]!, 10) : undefined;

      const properties: string[] = [];
      if (
        event.is("[data-omu]")
        || event.find("svg[aria-label='Originalfassung mit deutschen Untertiteln']").length > 0
      ) {
        properties.push("OmU");
      }
      const versionNote = event.find(".ut-note").attr("title");
      if (versionNote === "Originalfassung") {
        properties.push("OV");
      }

      const [year, month, day] = dateStr.split("-").map(n => parseInt(n, 10));
      const startTime = new Date(year!, month! - 1, day!, hours, minutes);

      screenings.push({
        movieTitle,
        startTime,
        properties: transformProperties(properties),
        cinemaId,
        releaseYear,
        length
      });
    });

    console.log(`Found ${screenings.length} screenings in Kinemathek.`);

    await deleteOldScreenings(screenings, cinemaId);

    return screenings;
  } catch (error) {
    console.error(`Error crawling Kinemathek: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// universum-city.de renders its program client side from the Cineamo API, so there is nothing to scrape in the HTML.
const CINEAMO_API = "https://api.cineamo.com";
// Cineamo cinema id of "Universum City Kinos Karlsruhe"
const CINEAMO_UNIVERSUM_ID = 104;

type CineamoMovie = {
  tmdbId: number | null;
  title: string | null;
  runtime: number | null;
  releaseDate: string | null;
  translations: {
    translations: { iso31661: string, iso6391: string, data: { title: string | null } | null }[] | null
  } | null;
};

type CineamoContent = {
  name: string | null;
  duration: number | null;
  _embedded?: { cineamoMovie?: CineamoMovie | null };
};

type CineamoShowing = {
  contentId: number;
  name: string;
  startDatetime: string;
  state: string;
  isOriginalLanguage: boolean | null;
  isSubtitled: boolean | null;
  subtitledLanguage: string | null;
  isThreeDimensional: boolean | null;
  isDbox: boolean | null;
  isDolbyAtmos: boolean | null;
  isImax: boolean | null;
  isDolbyVision: boolean | null;
  isDolbyCinema: boolean | null;
  is4DX: boolean | null;
  isScreenX: boolean | null;
  isHFR: boolean | null;
  isLive: boolean | null;
  showingTagIds: number[] | null;
  _embedded?: { content?: CineamoContent | null };
};

type CineamoShowingsPage = {
  _embedded?: { showings?: CineamoShowing[] },
  _links?: { next?: { href?: string } }
};

type MovieInfo = {
  title: string;
  titleProperties: string[];
  tmdbId?: number;
  length?: number;
  releaseDate?: Date;
};

async function crawlUniversum() {
  try {
    // Find cinema ID for Universum
    const { id: cinemaId } = await db.cinema.findFirstOrThrow({
      select: {
        id: true
      },
      where: {
        name: "Universum"
      }
    });

    // Collect the whole program from today on by following the paginated HAL links
    const showings: CineamoShowing[] = [];
    let nextUrl: string | undefined = `${CINEAMO_API}/showings?cinemaId=${CINEAMO_UNIVERSUM_ID}`
      + `&startDatetime=${encodeURIComponent(dayjs().startOf("day").toISOString())}&per_page=100`;
    let pages = 0;
    while (nextUrl && pages < 20) {
      const page: CineamoShowingsPage = await fetchCineamo<CineamoShowingsPage>(nextUrl);
      showings.push(...(page._embedded?.showings ?? []));
      nextUrl = page._links?.next?.href;
      pages++;
    }

    const scheduled = showings.filter(s => s.state === "scheduled");

    // The showings only embed a content stub, the movie metadata needs one request per content
    const contentIds = Array.from(new Set(scheduled.map(s => s.contentId)));
    const contents = new Map<number, MovieInfo>(await Promise.all(contentIds.map(async id => {
      const content = await fetchCineamo<CineamoContent>(`${CINEAMO_API}/contents/${id}`).catch(e => {
        console.error(`Error getting Cineamo content ${id}: ${e instanceof Error ? e.message : String(e)}`);
        return undefined;
      });
      const showing = scheduled.find(s => s.contentId === id)!;
      return [id, getMovieInfo(content ?? showing._embedded?.content ?? undefined, showing.name)] as const;
    })));

    // Cinema specific tags like "Sommerferienkino" are only referenced by id
    const tagIds = Array.from(new Set(scheduled.flatMap(s => s.showingTagIds ?? [])));
    const tagNames = new Map<number, string>((await Promise.all(tagIds.map(async id => {
      const tag = await fetchCineamo<{ name: string | null }>(`${CINEAMO_API}/showing-tags/${id}`).catch(e => {
        console.error(`Error getting Cineamo showing tag ${id}: ${e instanceof Error ? e.message : String(e)}`);
        return undefined;
      });
      return [id, tag?.name?.trim() ?? ""] as const;
    }))).filter(([, name]) => !!name));

    const screenings = scheduled.flatMap(showing => {
      const info = contents.get(showing.contentId);
      // startDatetime is UTC, so no timezone handling needed
      const startTime = new Date(showing.startDatetime);
      if (!info || isNaN(startTime.getTime())) {
        return [];
      }
      return [{
        movieTitle: info.title,
        startTime,
        properties: transformProperties([...getShowingProperties(showing, tagNames), ...info.titleProperties]),
        cinemaId,
        tmdbId: info.tmdbId,
        releaseDate: info.releaseDate,
        length: info.length
      }];
    });

    console.log(`Found ${screenings.length} screenings in Universum.`);

    await deleteOldScreenings(screenings, cinemaId);

    return screenings;
  } catch (error) {
    console.error(`Error crawling Universum: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function fetchCineamo<T>(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Fetching ${url} failed with status: ${response.status}`);
  }
  return await response.json() as T;
}

function firstNonEmpty(...values: (string | null | undefined)[]) {
  return values.map(v => v?.trim()).find(v => !!v);
}

function getMovieInfo(content: CineamoContent | undefined, showingName: string): MovieInfo {
  const movie = content?._embedded?.cineamoMovie;
  const duration = content?.duration;

  if (!movie) {
    // Events without a movie carry their properties in the title, e.g. "(ukrain. OV)Toy Story 5"
    const rawTitle = firstNonEmpty(content?.name, showingName)!;
    const prefix = /^\(([^)]*)\)\s*/.exec(rawTitle);
    const title = prefix ? rawTitle.substring(prefix[0].length).trim() : rawTitle;
    return {
      title: title || rawTitle,
      titleProperties: prefix && title ? [prefix[1]!.trim()] : [],
      length: duration && duration > 0 ? duration : undefined
    };
  }

  const germanTitle = movie.translations?.translations
    ?.find(t => t.iso31661 === "DE" && t.iso6391 === "de")?.data?.title;

  return {
    title: firstNonEmpty(germanTitle, movie.title, content?.name, showingName)!,
    titleProperties: [],
    tmdbId: movie.tmdbId ?? undefined,
    length: movie.runtime && movie.runtime > 0 ? movie.runtime : (duration && duration > 0 ? duration : undefined),
    releaseDate: movie.releaseDate ? dayjs(movie.releaseDate).toDate() : undefined
  };
}

function getShowingProperties(showing: CineamoShowing, tagNames: Map<number, string>) {
  const properties: string[] = [];

  if (showing.isSubtitled) {
    properties.push(showing.subtitledLanguage === "eng" ? "OmeU" : "OmU");
  } else if (showing.isOriginalLanguage) {
    properties.push("OV");
  }

  ([
    [showing.isThreeDimensional, "3D"],
    [showing.isDbox, "D-BOX"],
    [showing.isDolbyAtmos, "Dolby Atmos"],
    [showing.isImax, "IMAX"],
    [showing.isDolbyVision, "Dolby Vision"],
    [showing.isDolbyCinema, "Dolby Cinema"],
    [showing.is4DX, "4DX"],
    [showing.isScreenX, "ScreenX"],
    [showing.isHFR, "HFR"],
    [showing.isLive, "Live"]
  ] as const).forEach(([flag, name]) => {
    if (flag) {
      properties.push(name);
    }
  });

  (showing.showingTagIds ?? []).forEach(id => {
    const name = tagNames.get(id);
    if (name) {
      properties.push(name);
    }
  });

  return properties;
}

async function crawlFilmpalast() {
  try {
    const response = await fetch("https://www.filmpalast.net/programm/?time=week");
    if (!response.ok) {
      throw new Error(`Fetching Filmpalast failed with status: ${response.status}`);
    }
    const html = await response.text();
    const $ = load(html);

    // Find cinema ID for Filmpalast
    const { id: cinemaId } = await db.cinema.findFirstOrThrow({
      select: {
        id: true
      },
      where: {
        name: "Filmpalast"
      }
    });

    const scriptContent = $("script#pmkino-overview-script-js-extra").text();
    // Extract JSON content between curly braces
    const jsonMatch = /\{.*\}/s.exec(scriptContent);
    if (!jsonMatch) {
      throw new Error("Could not find JSON data in script content");
    }
    const jsonContent = jsonMatch[0];

    type Performance = {
      timeUtc: string | number;
      attributes?: {
        name: string;
      }[];
    };

    type Movie = {
      titleDisplay: string;
      title: string;
      length: number;
      productionYear: number;
      performances: (string | Performance)[];
    };

    const parsed = JSON.parse(jsonContent) as {
      apiData: {
        movies: { items: Record<string, Movie> },
        performances?: { items?: Record<string, Performance> }
      }
    };
    const performances = parsed.apiData.performances?.items ?? {};
    const data = Object.values(parsed.apiData.movies.items).filter((item: Movie) => !!item.performances);
    const result = data.flatMap((item: Movie) => {
      const movieTitle = item.titleDisplay || item.title;
      const length = item.length;
      const productionYear = item.productionYear;
      return item.performances.flatMap((p: Movie["performances"][number]) => {
        const performance = typeof p === "string" ? performances[p] : p;
        if (!performance?.timeUtc) {
          return [];
        }
        const timestamp = typeof performance.timeUtc === "number"
          ? performance.timeUtc
          : /^\d+$/.test(performance.timeUtc)
            ? parseInt(performance.timeUtc, 10)
            : Date.parse(performance.timeUtc);
        if (!Number.isFinite(timestamp)) {
          return [];
        }
        const startTime = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
        const attributes = (performance.attributes ?? []).map(a => a.name);
        return [{
          movieTitle,
          startTime,
          cinemaId,
          properties: transformProperties(attributes),
          releaseYear: productionYear,
          length
        }];
      });
    });

    console.log(`Found ${result.length} screenings in Filmpalast.`);

    await deleteOldScreenings(result, cinemaId);

    return result;
  } catch (error) {
    console.error(`Error crawling Filmpalast: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function getTMDB(url: string) {
  await tmdbRateLimiter.waitForToken(); // Apply rate limiting
  if (env.NODE_ENV === "development") {
    console.log("\x1b[32mtmdb:get\x1b[0m", url);
  }
  return await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.TMDB_API_KEY}`,
    },
  });
}
