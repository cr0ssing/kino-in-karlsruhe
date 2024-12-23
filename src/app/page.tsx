import { Title, Grid, GridCol } from "@mantine/core";
import { MovieCarousel } from "~/app/_components/MovieCarousel";
import { ScreeningTimetable } from "~/app/_components/ScreeningTimetable";
import dayjs from "dayjs";

import { api, HydrateClient } from "~/trpc/server";
import WeekNavigation from "./_components/WeekNavigation";

export default async function Home({
  searchParams,
}: {
  searchParams: { weekOffset?: string };
}) {

  // Get week offset from URL params (default to 0)
  const weekOffset = parseInt((await searchParams).weekOffset ?? "0");

  // Get this week's date range
  const startOfWeek = new Date();
  // getDay() returns 0-6 where 0 is Sunday, so we need to handle Monday differently
  const currentDay = startOfWeek.getDay();
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday + (weekOffset * 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Format dates for display
  const dateFormatter = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const dateRange = `${dateFormatter.format(startOfWeek)} - ${dateFormatter.format(endOfWeek)}`;

  // Fetch screenings for this week
  // TODO prefetch only
  const screenings = await api.screening.getAll({
    dateFrom: startOfWeek,
    dateTo: endOfWeek,
  });

  // prefetch next week
  void api.screening.getAll.prefetch({
    dateFrom: dayjs(startOfWeek).add(7, 'day').toDate(),
    dateTo: dayjs(endOfWeek).add(7, 'day').toDate(),
  });

  // prefetch last week
  void api.screening.getAll.prefetch({
    dateFrom: dayjs(startOfWeek).subtract(7, 'day').toDate(),
    dateTo: dayjs(endOfWeek).subtract(7, 'day').toDate(),
  });


  const uniqueMovies = Array.from(new Map(screenings.map(screening => [screening.movieId, screening.movie])).values());

  return (
    <HydrateClient>
      <Grid m="xl" gutter="xl">
        {/* TODO move to own component to use media query to make button text responsive */}
        <GridCol>
          <WeekNavigation weekOffset={weekOffset} dateRange={dateRange} />
          <Title order={2} mb="md">Filme</Title>
          <MovieCarousel movies={uniqueMovies} />
        </GridCol>

        <GridCol>
          <Title order={2} mb="md">Vorführungen</Title>
          <ScreeningTimetable screenings={screenings} />
        </GridCol>
      </Grid>
    </HydrateClient>
  );
}
