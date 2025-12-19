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
  "Open Archive"
].map(t => t.toLowerCase());

const select = { id: true, tmdbId: true, updatedAt: true, popularity: true, releaseDate: true, backdropUrl: true, searchTitles: true };

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
  screenings.forEach(s => {
    uniqueMovies.add(s.movieTitle);
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
    const segments = m.split("-");
    const prop = /\(([^)]*)\)/.exec(m)?.[1]?.trim();
    let movie;
    let searchTitle: string | null = null;
    let extraProperties: string[] = [];
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

    let tmdbId = movie?.tmdbId;
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
              await db.movie.update({
                where: { id: movie.id },
                data: { tmdbId: foundMovie.tmdbId }
              });
              movie.tmdbId = foundMovie.tmdbId;
            } else {
              await db.movie.update({
                where: { id: movie.id },
                data: { tmdbId: null }
              });
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
    const movie = await db.movie.create({
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
        const movieTitle = $screening.find(".schauburg-previewelement-title").text().trim();
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
      case "Originalfassung mit dt. Untertitel":
      case "im engl. Original mit dt. Untertiteln":
      case "engl. OmU":
      case "omu":
        result = "OmU";
        break;
      case "englisches OV, ohne Untertitel":
      case "englische OV, ohne Untertitel":
      case "Englische Originalfassung":
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
    const response = await fetch("https://kinemathek-karlsruhe.de/spielplan/");
    if (!response.ok) {
      throw new Error(`Fetching Kinemathek failed with status: ${response.status}`);
    }
    const html = await response.text();
    const $ = load(html);

    const screenings: Screening[] = [];

    // Find cinema ID for Kinemathek
    const { id: cinemaId } = await db.cinema.findFirstOrThrow({
      select: {
        id: true
      },
      where: {
        name: "Kinemathek"
      }
    });

    // Find all date headers (h3 with class wpt_listing_group day)
    $(".entry-content h3.wpt_listing_group.day").each((_, dateHeader) => {
      const dateText = $(dateHeader).text().trim();
      // Extract date from format like "Donnerstag 2. Januar" or "Montag 5. März"
      // Use a regex that handles German month names with umlauts (ä, ö, ü)
      const dateMatch = /(\d{1,2}) ([A-Za-zäöüÄÖÜ]+)/.exec(dateText);
      if (!dateMatch) return;

      const [, day, month] = dateMatch;
      // Convert German month name to number
      const monthNum = getMonthNumber(month!);
      if (monthNum === -1) return;

      // Get all screenings that follow this date header until the next one
      let currentElement = $(dateHeader).next();

      const allowedProperties = ["OmU", "OmeU", "Mit englischen Untertiteln"];

      while (currentElement.length && !currentElement.hasClass("wpt_listing_group")) {
        if (currentElement.hasClass("wp_theatre_event")) {
          const timeText = currentElement.find(".wp_theatre_event_datetime").text().trim();
          const [hours, minutes] = timeText.split(":").map(n => parseInt(n));

          const movieTitle = currentElement.find(".wp_theatre_event_title a").text().trim();

          // Extract properties from tags
          const properties: string[] = [];

          // Add technical specs as properties
          const techSpecs = currentElement.find(".wp_theatre_event_cine_technical_specs").text().trim();
          // Kinemathek specs are not separated consistently, so not all specs can be extracted
          const specs = techSpecs.split(/[;,|]/).map(spec => spec.trim());
          specs.filter(spec => allowedProperties.includes(spec)).forEach(spec => properties.push(spec));

          // Find release year from specs (format: "Country YYYY")
          const yearSpec = specs.find(spec => {
            const parts = spec.trim().split(/\s+/);
            return parts.some(part => part.length === 4 && !isNaN(parseInt(part)));
          });
          const releaseYear = yearSpec
            ? parseInt(yearSpec.split(/\s+/).find(part => part.length === 4 && !isNaN(parseInt(part)))!)
            : undefined;

          // Find length from specs (format: "XXX Min.")
          const lengthSpec = specs.find(spec => ["Min.", "Mins.", "Min", "Mins", "′"].map(s => spec.trim().endsWith(s)).some(Boolean))
            ?.trim().split(/\s+/)[0];
          const length = lengthSpec ? parseInt(lengthSpec) : undefined;

          const subtitleSpec = specs.find(spec => allowedProperties.map(s => spec.trim().endsWith(s)).some(Boolean));
          if (subtitleSpec) {
            const subtitle = allowedProperties.find(p => subtitleSpec.trim().endsWith(p));
            if (subtitle) {
              properties.push(subtitle);
            }
          }

          // Create date object (use next year if month is less than current month)
          const now = new Date();
          let year = now.getFullYear();
          if (monthNum < now.getMonth() + 1) {
            year++;
          }

          const startTime = new Date(year, monthNum - 1, parseInt(day!), hours, minutes);

          screenings.push({
            movieTitle,
            startTime,
            properties: transformProperties(properties),
            cinemaId,
            releaseYear,
            length
          });
        }
        currentElement = currentElement.next();
      }
    });

    console.log(`Found ${screenings.length} screenings in Kinemathek.`);

    await deleteOldScreenings(screenings, cinemaId);

    return screenings;
  } catch (error) {
    console.error(`Error crawling Kinemathek: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// Helper function to convert German month names to numbers
function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    "Januar": 1,
    "Februar": 2,
    "März": 3,
    "April": 4,
    "Mai": 5,
    "Juni": 6,
    "Juli": 7,
    "August": 8,
    "September": 9,
    "Oktober": 10,
    "November": 11,
    "Dezember": 12
  };
  return months[monthName] ?? -1;
}

async function crawlUniversum() {
  const url = "https://www.kinopolis.de/ka/programm";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetching Universum failed with status: ${response.status}`);
    }
    const html = await response.text();
    const $ = load(html);

    // Find cinema ID for Universum
    const { id: cinemaId } = await db.cinema.findFirstOrThrow({
      select: {
        id: true
      },
      where: {
        name: "Universum"
      }
    });

    const screenings: Screening[] = [];

    // Iterate through each movie section
    $(".movie").each((_, movieSection) => {
      const movieTitle = $(movieSection).find("h2.hl--1 .hl-link").first().text().trim();
      const releaseDateString = $(movieSection)
        .find(".movie__specs-el")
        .filter((_, text) => $(text).text().trim().startsWith("Start: "))
        .first().text().trim().split(" ")[1];
      const releaseDate = releaseDateString ? dayjs(releaseDateString, "DD.MM.YYYY").toDate() : undefined;
      const lengthString = $(movieSection).find(".movie__specs-el").filter((_, text) => $(text).text().trim().startsWith("Dauer: ")).first().text().trim().split(" ")[1];
      const length = lengthString ? parseInt(lengthString) : undefined;

      // Get all date navigation items
      $(movieSection).find(".prog-nav__item").each((_, dateNav) => {
        const $dateNav = $(dateNav);
        const dayText = $dateNav.find(".prog-nav__day").text().trim();

        // Skip if no performance IDs or it"s a "weitere Spielzeiten" link
        const performanceIds = $dateNav.attr("data-performance-ids")!;
        if (!performanceIds || performanceIds.includes("»")) return;

        // Parse the IDs and find corresponding screenings
        const ids = performanceIds.replace(/\[|\]/g, "").split(",");

        ids.forEach(id => {
          const $screening = $(movieSection).find(`[data-performance-id="${id}"]`);
          if (!$screening.length) return;

          const timeText = $screening.find(".prog2__time").text().trim();
          const [hours, minutes] = timeText.split(":").map(Number);

          // Create date from day text and time
          const date = parseGermanDate(dayText);
          if (!date) return;

          date.setHours(hours!, minutes, 0, 0);

          const properties: string[] = [];
          const versionData = $screening.find(".buy__btn").attr("data-version");
          if (versionData) {
            properties.push(...(JSON.parse(versionData) as string[]));
          }

          screenings.push({
            movieTitle,
            startTime: date,
            properties: transformProperties(properties),
            cinemaId,
            releaseDate,
            length
          });
        });
      });
    });

    console.log(`Found ${screenings.length} screenings in Universum.`);

    await deleteOldScreenings(screenings, cinemaId);

    return screenings;
  } catch (error) {
    console.error(`Error crawling Universum: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// Helper function to parse German date text
function parseGermanDate(dayText: string): Date | null {
  const today = new Date();

  if (dayText.includes("Heute")) {
    return today;
  }

  if (dayText.includes("Morgen")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }

  // Handle format like "So. 22.12."
  const match = /\d{2}\.\d{2}\./.exec(dayText);
  if (match) {
    const [day, month] = match[0].split(".").map(Number);
    const date = new Date(today.getFullYear(), month! - 1, day);
    return date;
  }

  return null;
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

    type Movie = {
      titleDisplay: string;
      title: string;
      length: number;
      productionYear: number;
      performances: {
        timeUtc: string;
        attributes: {
          name: string;
        }[];
      }[];
    };

    const parsed = JSON.parse(jsonContent) as { apiData: { movies: { items: Record<string, Movie> } } }
    const data = Object.values(parsed.apiData.movies.items).filter((item: Movie) => !!item.performances);
    const result = data.map((item: Movie) => {
      const movieTitle = item.titleDisplay || item.title;
      const length = item.length;
      const productionYear = item.productionYear;
      return item.performances.map((p: Movie["performances"][number]) => ({
        movieTitle,
        startTime: new Date(p.timeUtc),
        cinemaId,
        properties: transformProperties(p.attributes.map((a: Movie["performances"][number]["attributes"][number]) => a.name)),
        releaseYear: productionYear,
        length
      }))
    }).flat();

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
