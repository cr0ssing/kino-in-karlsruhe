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

import { PrismaClient } from "@prisma/client"
import { run } from "~/server/api/crawler";

const prisma = new PrismaClient()

async function main() {
  const cinemasData = [
    {
      name: "Schauburg",
      address: "Marienstraße 16, 76137 Karlsruhe",
      website: "www.schauburg.de",
      color: "#d42013"
    },
    {

      name: "Kinemathek",
      address: "Kaiserpassage 6, 76133 Karlsruhe",
      website: "www.kinemathek-karlsruhe.de",
      color: "#10b02b"
    },
    {
      name: "Universum",
      address: "Kaiserstraße 152-154, 76133 Karlsruhe",
      website: "www.kinopolis.de/ka",
      color: "#e6ca19"
    },
    {
      name: "Filmpalast",
      address: "Brauerstraße 40 - 76135 Karlsruhe",
      website: "www.filmpalast.net",
      color: "#0e41cc"
    }] as const;

  await Promise.all(cinemasData.map(c => prisma.cinema.upsert({
    where: { name: c.name },
    update: {},
    create: c
  })));

  const { screenings, movies } = await run();

  console.log(`Created ${movies.length} movies.`);
  console.log(`Created ${screenings.length} screenings.`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect();
  })
