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
import dayjs from "dayjs";
import { Prisma } from "@prisma/client";

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

  getInfiniteScreenings: publicProcedure.input(
    z.object({
      dayAmount: z.number(),
      movieId: z.number().optional(),
      cursor: z.date().nullish()
    })
  )
    .query(async ({ ctx, input }) => {
      const { dayAmount, movieId, cursor } = input;

      let startDate = cursor;

      const aggregations = await ctx.db.screening.aggregate({
        _min: {
          startTime: true,
        },
        _max: {
          startTime: true,
        },
        where: {
          movieId: movieId ?? Prisma.skip
        }
      });
      
      startDate ??= aggregations._min.startTime;

      if (!startDate) {
        return {
          screenings: [],
          cursor: null,
        };
      }

      let result = [];
      let hasNextPage;
      do {
        const endDate = dayjs(startDate).add(dayAmount - 1, 'day').endOf('day').toDate();
        result = await ctx.db.screening.findMany({
          where: {
            AND: [
              { startTime: { gte: startDate } },
              { startTime: { lte: endDate } },
              movieId ? { movieId } : {},
            ],
          },
          orderBy: [
            { startTime: 'asc' },
            { id: 'asc' },
          ],
          include: {
            movie: true,
            cinema: true,
          },
        });

        startDate = dayjs(endDate).add(1, "day").startOf("day").toDate();
        hasNextPage = !dayjs(startDate).isAfter(aggregations._max.startTime);
      } while (result.length === 0 && hasNextPage);

      return {
        screenings: result,
        cursor: !hasNextPage ? undefined : startDate,
      };
    }),

  getDateRange: publicProcedure
    .input(
      z.object({
        movieId: z.number().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { movieId } = input;

      const aggregations = await ctx.db.screening.aggregate({
        _min: {
          startTime: true,
        },
        _max: {
          startTime: true,
        },
        where: {
          movieId: movieId ?? Prisma.skip
        }
      });

      return {
        minDate: aggregations._min.startTime,
        maxDate: aggregations._max.startTime,
      };
    }),
});
