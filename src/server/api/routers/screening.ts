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
