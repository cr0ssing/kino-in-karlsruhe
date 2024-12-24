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

export const cinemaRouter = createTRPCRouter({
  // Get all cinemas
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.cinema.findMany();
  }),

  // Get a single cinema by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cinema.findUnique({
        where: { id: input.id },
        include: { Screening: true },
      });
    }),

  // Get cinemas with optional search/filter
  search: publicProcedure
    .input(
      z.object({
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(), // for pagination
      })
    )
    .query(async ({ ctx, input }) => {
      const { searchTerm, limit, cursor } = input;

      const result = await ctx.db.cinema.findMany({
        where: searchTerm ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { address: { contains: searchTerm, mode: 'insensitive' } },
          ],
        } : undefined,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { name: 'asc' },
      });
      let nextCursor: number | undefined = undefined;
      if (input?.limit && result.length > input.limit) {
        const nextItem = result.pop();
        nextCursor = nextItem!.id;
      }
      return {
        result,
        nextCursor,
      };
    }),
});
