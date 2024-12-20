import { load } from "cheerio";
import { db } from "~/server/db";
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';

dayjs.extend(minMax);

export async function run() {
  console.log("Running crawlers");
  const screenings = (await Promise.all([crawlSchauburg(), crawlKinemathek()])).flat();

  // Delete existing screenings
  await db.screening.deleteMany({
    where: {
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
        cinemaId: screening.cinemaId
      }
    });
  }
}

type Screening = {
  movieTitle: string;
  startTime: Date;
  properties: string[];
  cinemaId: number;
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

      const properties: string[] = [];

      const movieCell = $(row).find('td').last();
      // Extract text in brackets at the end of the movie title
      const bracketMatch = movieCell.text().trim().match(/\(([^)]*)\)$/);
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

  console.log(`Found ${screenings.length} screenings`);

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
  $('h3.wpt_listing_group.day').each((_, dateHeader) => {
    const dateText = $(dateHeader).text().trim();
    // Extract date from format like "Donnerstag 2. Januar"
    const dateMatch = dateText.match(/(\d{1,2})\. (\w+)/);
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

  console.log(`Found ${screenings.length} screenings`);

  return screenings;
}

// Helper function to convert German month names to numbers
function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
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
  return months[monthName] || -1;
}
