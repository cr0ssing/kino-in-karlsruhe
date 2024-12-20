import { load } from "cheerio";
import { db } from "~/server/db";
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(minMax);

export async function run() {
  console.log("Running scheduler");
  await crawlSchauburg();
}

async function crawlSchauburg() {
  const response = await fetch("https://schauburg.de/programm.php");
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('iso-8859-1');
  const html = decoder.decode(buffer);
  const $ = load(html);

  const screenings: Array<{
    movieTitle: string;
    startTime: Date;
    properties: string[];
  }> = [];

  // Process each date section (h5) and its following table
  $('h5').each((_, dateElement) => {
    const dateText = $(dateElement).text().trim();
    // Extract date from formats like "Heute, 20.12." or "Sa, 21.12."
    const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\./);
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

      const movieCell = $(row).find('td').last();
      const movieTitle = movieCell.find('a').text().trim().replace(/\s*\([^)]*\)\s*$/, '');

      // Extract properties from italic text
      const properties: string[] = [];
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
      });
    });
  });

  console.log(`Found ${screenings.length} screenings`);

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

  // Delete existing screenings
  await db.screening.deleteMany({
    where: {
      cinemaId,
      startTime: {
        gte: dayjs.min(screenings.map(s => dayjs(s.startTime)))?.toDate(),
        lte: dayjs.max(screenings.map(s => dayjs(s.startTime)))?.toDate()
      }
    }
  });

  // Insert screenings and create movies if they don't exist
  for (const screening of screenings) {
    // Find or create the movie
    let movie = await db.movie.findFirst({
      where: { title: screening.movieTitle }
    });

    if (!movie) {
      movie = await db.movie.create({
        data: { title: screening.movieTitle }
      });
    }

    // Create the screening
    await db.screening.create({
      data: {
        movieId: movie.id,
        startTime: screening.startTime,
        properties: screening.properties,
        cinemaId
      }
    });
  }

  console.log('Finished importing screenings');
}

