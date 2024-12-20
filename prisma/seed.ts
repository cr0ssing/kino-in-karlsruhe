import { PrismaClient } from '@prisma/client'
import { add } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  // Clean up existing data
  await prisma.screening.deleteMany()
  await prisma.cinema.deleteMany()
  await prisma.movie.deleteMany()

  // Create cinemas
  const cinemas = await Promise.all([
    prisma.cinema.create({
      data: {
        name: 'Cineplex Downtown',
        address: '123 Main Street, Downtown',
        website: 'www.cineplex-downtown.com',
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'MovieMax Plaza',
        address: '456 Park Avenue, Uptown',
        website: 'www.moviemax.com',
      },
    }),
  ])

  // Create movies
  const movies = await Promise.all([
    prisma.movie.create({
      data: {
        title: 'The Matrix Resurrections',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Dune',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Spider-Man: No Way Home',
      },
    }),
  ])

  // Create screenings
  const now = new Date()
  const screenings = await Promise.all([
    // Screenings for Cineplex Downtown
    prisma.screening.create({
      data: {
        cinemaId: cinemas[0].id,
        movieId: movies[0].id,
        startTime: add(now, { days: 1, hours: 2 }),
        properties: ['IMAX', '3D'],
      },
    }),
    prisma.screening.create({
      data: {
        cinemaId: cinemas[0].id,
        movieId: movies[1].id,
        startTime: add(now, { days: 1, hours: 5 }),
        properties: ['Standard'],
      },
    }),
    // Screenings for MovieMax Plaza
    prisma.screening.create({
      data: {
        cinemaId: cinemas[1].id,
        movieId: movies[2].id,
        startTime: add(now, { days: 2, hours: 3 }),
        properties: ['Dolby Atmos', '4K'],
      },
    }),
  ])

  console.log({
    cinemas,
    movies,
    screenings,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
