import { PrismaClient } from '@prisma/client'
import { run } from '~/server/api/crawler';

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
        color: '#d42013'
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Kinemathek',
        address: 'Kaiserpassage 6, 76133 Karlsruhe',
        website: 'www.kinemathek-karlsruhe.de',
        color: '#10b02b'
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Universum',
        address: 'Kaiserstraße 152-154, 76133 Karlsruhe',
        website: 'www.kinopolis.de/ka',
        color: '#e6ca19'
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Filmpalast',
        address: 'Brauerstraße 40 - 76135 Karlsruhe',
        website: 'www.filmpalast.net',
        color: '#0e41cc'
      },
    }),
  ])

  const { screenings, movies } = await run();


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
