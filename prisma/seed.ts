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
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Kinemathek',
        address: 'Kaiserpassage 6, 76133 Karlsruhe',
        website: 'www.kinemathek-karlsruhe.de',
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Universum',
        address: 'Kaiserstraße 152-154, 76133 Karlsruhe',
        website: 'www.kinopolis.de/ka',
      },
    }),
    prisma.cinema.create({
      data: {
        name: 'Filmpalast',
        address: 'Brauerstraße 40 - 76135 Karlsruhe',
        website: 'www.filmpalast.net',
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
