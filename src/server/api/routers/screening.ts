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

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const screeningRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
        movieId: z.number().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, movieId } = input;

      const result = await ctx.db.screening.findMany({
        where: {
          AND: [
            // Date range filter
            dateFrom ? { startTime: { gte: dateFrom } } : {},
            dateTo ? { startTime: { lte: dateTo } } : {},
            // Movie filter
            movieId ? { movieId: movieId } : {},
          ],
        },
        orderBy: { startTime: 'asc' },
        include: {
          movie: true,
          cinema: true,
        },
      });
      return result;
    }),
});
