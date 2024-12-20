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
