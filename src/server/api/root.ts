import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { cinemaRouter } from "./routers/cinema";
import { screeningRouter } from "./routers/screening";
import { schedule } from 'node-cron';
import { run } from "./crawler";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  cinema: cinemaRouter,
  screening: screeningRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

console.log("Starting scheduler");
schedule('0 2 * * *', () => {
  void run();
});
