import { Title, Grid, GridCol, Group, Button, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { MovieCarousel } from "~/app/_components/MovieCarousel";
import { ScreeningTimetable } from "~/app/_components/ScreeningTimetable";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home({
  searchParams,
}: {
  searchParams: { weekOffset?: string };
}) {
  // Get week offset from URL params (default to 0)
  const weekOffset = parseInt(searchParams.weekOffset ?? "0");

  // Get this week's date range
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1 + (weekOffset * 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

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

  const uniqueMovies = Array.from(new Map(screenings.map(screening => [screening.movieId, screening.movie])).values());

  return (
    <HydrateClient>
      <Grid m="xl" gutter="xl">
        <GridCol>
          <Group justify="center" mb="xl">
            <Button
              component="a"
              href={`/?weekOffset=${weekOffset - 1}`}
              variant="subtle"
              leftSection={<IconChevronLeft size={16} />}
            >
              Vorherige Woche
            </Button>

            <Text fw={500}>{dateRange}</Text>

            <Button
              component="a"
              href={`/?weekOffset=${weekOffset + 1}`}
              variant="subtle"
              rightSection={<IconChevronRight size={16} />}
            >
              Nächste Woche
            </Button>
          </Group>

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
