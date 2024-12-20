import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'

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
        name: 'Schauburg',
        address: 'Marienstraße 16, 76137 Karlsruhe',
        website: 'www.schauburg.de',
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Kinemathek',
        address: 'Kaiserpassage 6, 76133 Karlsruhe',
        website: 'www.kinemathek-karlsruhe.de',
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
        startTime: dayjs(now).add(1, 'day').add(2, 'hour').toDate(),
        properties: ['IMAX', '3D'],
      },
    }),
    prisma.screening.create({
      data: {
        cinemaId: cinemas[0].id,
        movieId: movies[1].id,
        startTime: dayjs(now).add(1, 'day').add(5, 'hour').toDate(),
        properties: ['Standard'],
      },
    }),
    // Screenings for MovieMax Plaza
    prisma.screening.create({
      data: {
        cinemaId: cinemas[1].id,
        movieId: movies[2].id,
        startTime: dayjs(now).add(2, 'day').add(3, 'hour').toDate(),
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
