import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const screeningRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
        movieId: z.number().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, movieId, limit, cursor } = input;

      // TODO remove pagination
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
        take: limit ? limit + 1 : undefined,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { startTime: 'asc' },
        include: {
          movie: true,
          cinema: true,
        },
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
