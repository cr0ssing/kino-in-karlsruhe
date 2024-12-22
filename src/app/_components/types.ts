import { Screening } from "@prisma/client";

export type CombinedScreening = Screening & {
  movie: { title: string, length: number | null },
  cinemas: { name: string, color: string }[],
  columnIndex: number,
  totalColumns: number,
};