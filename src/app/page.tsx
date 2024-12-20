import { Container, Title, Grid, GridCol } from "@mantine/core";
import { MovieCarousel } from "~/app/_components/MovieCarousel";
import { ScreeningTimetable } from "~/app/_components/ScreeningTimetable";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  // Get this week's date range
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Set to Monday of current week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // Fetch screenings for this week
  // TODO prefetch only
  const { result: screenings, nextCursor } = await api.screening.getAll({
    dateFrom: startOfWeek,
    dateTo: endOfWeek,
  });

  const uniqueMovies = Array.from(new Map(screenings.map(screening => [screening.movieId, screening.movie])).values());

  return (
    <HydrateClient>
      <Container size="xl" mt="xl">
        <Grid gutter="xl">
          {/* Movie Carousel Section */}
          <GridCol>
            <Title order={2} mb="md">Filme</Title>
            <MovieCarousel movies={uniqueMovies} />
          </GridCol>

          {/* Timetable Section */}
          <GridCol mt="xl">
            <Title order={2} mb="md">Vorführungen</Title>
            <ScreeningTimetable screenings={screenings} />
          </GridCol>
        </Grid>
      </Container>
    </HydrateClient>
  );
}
