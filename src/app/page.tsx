import { Container, Title, Grid, GridCol } from "@mantine/core";
import { MovieCarousel } from "~/app/_components/MovieCarousel";
import { ScreeningTimetable } from "~/app/_components/ScreeningTimetable";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  // Get this week's date range
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);

  // Fetch screenings for this week
  // TODO prefetch only
  const { result: screenings, nextCursor } = await api.screening.getAll({
    dateFrom: today,
    dateTo: endOfWeek,
  });

  const uniqueMovies = Array.from(new Map(screenings.map(screening => [screening.movieId, screening.movie])).values());

  return (
    <HydrateClient>
      <Container size="xl" mt="xl">
        <Grid gutter="xl">
          {/* Movie Carousel Section */}
          <GridCol>
            <Title order={2} mb="md">Now Showing</Title>
            <MovieCarousel movies={uniqueMovies} />
          </GridCol>

          {/* Timetable Section */}
          <GridCol mt="xl">
            <Title order={2} mb="md">This Week&apos;s Screenings</Title>
            <ScreeningTimetable screenings={screenings} />
          </GridCol>
        </Grid>
      </Container>
    </HydrateClient>
  );
}
