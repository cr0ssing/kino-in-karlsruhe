import { load } from "cheerio";
import { db } from "~/server/db";
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import { env } from "process";

dayjs.extend(minMax);

type Screening = {
  movieTitle: string;
  startTime: Date;
  properties: string[];
  cinemaId: number;
}

export async function run() {
  console.log("Running crawlers");
  const screenings = (await Promise.all([
    crawlSchauburg(),
    crawlKinemathek(),
    crawlUniversum(),
    crawlFilmpalast()
  ])).flat() as Screening[];

  // Delete existing screenings
  await db.screening.deleteMany({
    where: {
      startTime: {
        gte: dayjs.min(screenings.map(s => dayjs(s.startTime)))?.toDate(),
        lte: dayjs.max(screenings.map(s => dayjs(s.startTime)))?.toDate()
      }
    }
  });

  const movies = [];
  const insertedScreenings = [];

  // Insert screenings and create movies if they don't exist
  for (const screening of screenings) {
    // Find or create the movie
    let movie = await db.movie.findFirst({
      where: { title: screening.movieTitle }
    });

    if (!movie) {
      const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${screening.movieTitle}&include_adult=true&language=de-DE`, {
        headers: {
          Authorization: `Bearer ${env.TMDB_API_KEY}`,
        },
      });
      const data = await response.json() as { results: { poster_path: string, id: number }[] };
      const result = data.results[0];
      const details = await fetch(` https://api.themoviedb.org/3/movie/${result?.id}`, {
        headers: {
          Authorization: `Bearer ${env.TMDB_API_KEY}`,
        },
      }).then(r => r.json()) as { runtime: number };
      movie = await db.movie.create({
        data: { title: screening.movieTitle, posterUrl: result?.poster_path, tmdbId: result?.id, length: details.runtime }
      });
    }

    movies.push(movie);

    // Create the screening
    insertedScreenings.push(await db.screening.create({
      data: {
        movieId: movie.id,
        startTime: screening.startTime,
        properties: screening.properties,
        cinemaId: screening.cinemaId
      }
    }));
  }
  return { screenings: insertedScreenings, movies };
}

async function crawlSchauburg() {
  const response = await fetch("https://schauburg.de/programm.php");
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('iso-8859-1');
  const html = decoder.decode(buffer);
  const $ = load(html);

  const screenings: Screening[] = [];

  // Find cinema ID for Schauburg
  const { id: cinemaId } = await db.cinema.findFirstOrThrow({
    select: {
      id: true
    },
    where: {
      name: 'Schauburg'
    }
  });

  if (!cinemaId) {
    throw new Error('Cinema "Schauburg" not found');
  }

  // Process each date section (h5) and its following table
  $('h5').each((_, dateElement) => {
    const dateText = $(dateElement).text().trim();
    // Extract date from formats like "Heute, 20.12." or "Sa, 21.12."
    const dateMatch = /(\d{1,2})\.(\d{1,2})\./.exec(dateText);
    if (!dateMatch) return;

    const [, day, month] = dateMatch;
    // Assuming current year for simplicity, adjust if needed
    const year = new Date().getFullYear();

    // Get the table that follows this h5
    const table = $(dateElement).next('table');

    // Process each row in the table
    table.find('tr').each((_, row) => {
      const timeText = $(row).find('td').first().text().trim();
      const [hours, minutes] = timeText.split('.').map(n => parseInt(n));

      const properties: string[] = [];

      const movieCell = $(row).find('td').last();
      // Extract text in brackets at the end of the movie title
      const bracketMatch = /\(([^)]*)\)$/.exec(movieCell.text().trim());
      const bracketContent = bracketMatch ? bracketMatch[1]!.trim() : '';
      if (bracketContent) {
        properties.push(bracketContent);
      }
      const movieTitle = movieCell.find('a').text().trim().replace(/\s*\([^)]*\)\s*$/, '');

      // Extract properties from italic text

      movieCell.find('i').each((_, italic) => {
        const propText = $(italic).text().trim();
        if (propText) {
          // Split by comma and clean up each property
          propText.split(',').forEach(prop => {
            const cleanProp = prop.trim();
            if (cleanProp) properties.push(cleanProp);
          });
        }
      });

      // Create date object
      const startTime = new Date(year, parseInt(month!) - 1, parseInt(day!), hours, minutes);

      screenings.push({
        movieTitle,
        startTime,
        properties,
        cinemaId
      });
    });
  });

  console.log(`Found ${screenings.length} screenings in Schauburg.`);

  return screenings;
}

async function crawlKinemathek() {
  const response = await fetch("https://kinemathek-karlsruhe.de/spielplan/");
  const html = await response.text();
  const $ = load(html);

  const screenings: Screening[] = [];

  // Find cinema ID for Kinemathek
  const { id: cinemaId } = await db.cinema.findFirstOrThrow({
    select: {
      id: true
    },
    where: {
      name: 'Kinemathek'
    }
  });

  // Find all date headers (h3 with class wpt_listing_group day)
  $('.entry-content h3.wpt_listing_group.day').each((_, dateHeader) => {
    const dateText = $(dateHeader).text().trim();
    // Extract date from format like "Donnerstag 2. Januar"
    const dateMatch = /(\d{1,2})\. (\w+)/.exec(dateText);
    if (!dateMatch) return;

    const [, day, month] = dateMatch;
    // Convert German month name to number
    const monthNum = getMonthNumber(month!);
    if (monthNum === -1) return;

    // Get all screenings that follow this date header until the next one
    let currentElement = $(dateHeader).next();

    const allowedProperties = ["OmU"];

    while (currentElement.length && !currentElement.hasClass('wpt_listing_group')) {
      if (currentElement.hasClass('wp_theatre_event')) {
        const timeText = currentElement.find('.wp_theatre_event_datetime').text().trim();
        const [hours, minutes] = timeText.split(':').map(n => parseInt(n));

        const movieTitle = currentElement.find('.wp_theatre_event_title a').text().trim();

        // Extract properties from tags
        const properties: string[] = [];

        // Add technical specs as properties
        const techSpecs = currentElement.find('.wp_theatre_event_cine_technical_specs').text().trim();
        const specs = techSpecs.split('|').map(spec => spec.trim());
        specs.filter(spec => allowedProperties.includes(spec)).forEach(spec => properties.push(spec));

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
          properties,
          cinemaId
        });
      }
      currentElement = currentElement.next();
    }
  });

  console.log(`Found ${screenings.length} screenings in Kinemathek.`);

  return screenings;
}

// Helper function to convert German month names to numbers
function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    'Januar': 1,
    'Februar': 2,
    'März': 3,
    'April': 4,
    'Mai': 5,
    'Juni': 6,
    'Juli': 7,
    'August': 8,
    'September': 9,
    'Oktober': 10,
    'November': 11,
    'Dezember': 12
  };
  return months[monthName] ?? -1;
}

async function crawlUniversum() {
  const url = 'https://www.kinopolis.de/ka/programm';
  const response = await fetch(url);
  const html = await response.text();
  const $ = load(html);

  // Find cinema ID for Schauburg
  const { id: cinemaId } = await db.cinema.findFirstOrThrow({
    select: {
      id: true
    },
    where: {
      name: 'Universum'
    }
  });

  if (!cinemaId) {
    throw new Error('Cinema "Universum" not found');
  }

  const screenings: Screening[] = [];

  // Iterate through each movie section
  $('.movie').each((_, movieSection) => {
    const movieTitle = $(movieSection).find('h2.hl--1 .hl-link').first().text().trim();

    // Get all date navigation items
    $(movieSection).find('.prog-nav__item').each((_, dateNav) => {
      const $dateNav = $(dateNav);
      const dayText = $dateNav.find('.prog-nav__day').text().trim();

      // Skip if no performance IDs or it's a "weitere Spielzeiten" link
      const performanceIds = $dateNav.attr('data-performance-ids')!;
      if (!performanceIds || performanceIds.includes('»')) return;

      // Parse the IDs and find corresponding screenings
      const ids = performanceIds.replace(/\[|\]/g, '').split(',');

      ids.forEach(id => {
        const $screening = $(movieSection).find(`[data-performance-id="${id}"]`);
        if (!$screening.length) return;

        const timeText = $screening.find('.prog2__time').text().trim();
        const [hours, minutes] = timeText.split(':').map(Number);

        // Create date from day text and time
        const date = parseGermanDate(dayText);
        if (!date) return;

        date.setHours(hours!, minutes, 0, 0);

        const properties: string[] = [];
        const versionData = $screening.find('.buy__btn').attr('data-version');
        if (versionData) {
          properties.push(...(JSON.parse(versionData) as string[]));
        }

        screenings.push({
          movieTitle,
          startTime: date,
          properties,
          cinemaId
        });
      });
    });
  });

  console.log(`Found ${screenings.length} screenings in Universum.`);

  return screenings;
}

// Helper function to parse German date text
function parseGermanDate(dayText: string): Date | null {
  const today = new Date();

  if (dayText.includes('Heute')) {
    return today;
  }

  if (dayText.includes('Morgen')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }

  // Handle format like "So. 22.12."
  const match = /\d{2}\.\d{2}\./.exec(dayText);
  if (match) {
    const [day, month] = match[0].split('.').map(Number);
    const date = new Date(today.getFullYear(), month! - 1, day);
    return date;
  }

  return null;
}

async function crawlFilmpalast() {
  const response = await fetch('https://www.filmpalast.net/programm/?time=week');
  const html = await response.text();
  const $ = load(html);

  // Find cinema ID for Schauburg
  const { id: cinemaId } = await db.cinema.findFirstOrThrow({
    select: {
      id: true
    },
    where: {
      name: 'Filmpalast'
    }
  });

  if (!cinemaId) {
    throw new Error('Cinema "Filmpalast" not found');
  }

  const scriptContent = $('script#pmkino-shortcode-program-script-js-extra').text();
  // Extract JSON content between curly braces
  const jsonMatch = /\{.*\}/s.exec(scriptContent);
  if (!jsonMatch) {
    throw new Error('Could not find JSON data in script content');
  }
  const jsonContent = jsonMatch[0];

  type Movie = {
    titleDisplay: string;
    title: string;
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
    return item.performances.map((p: Movie['performances'][number]) => ({
      movieTitle,
      startTime: new Date(p.timeUtc),
      cinemaId,
      properties: p.attributes.map((a: Movie['performances'][number]['attributes'][number]) => a.name)
    }))
  }).flat();

  console.log(`Found ${result.length} screenings in Filmpalast.`);

  return result;
}