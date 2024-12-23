"use client";

import { Button, Group, Title } from "@mantine/core";
import type { Cinema, Movie, Screening } from "@prisma/client";
import ScreeningTimetable from "./ScreeningTimetable";
import MovieCarousel from "./MovieCarousel";
import { useState } from "react";

export default function TimetablePage({ screenings, weekOffset }: { screenings: (Screening & { movie: Movie, cinema: Cinema })[], weekOffset: number }) {
  const uniqueMovies = Array.from(new Map(screenings.map(screening => [screening.movieId, screening.movie])).values());

  const [filteredMovies, setFilteredMovies] = useState(uniqueMovies.map(m => m.id));

  const toggleMovie = (movieId: number) => {
    const allMoviesEnabled = filteredMovies.length === uniqueMovies.length;

    if (allMoviesEnabled) {
      // If all movies are enabled, only keep the clicked movie
      setFilteredMovies([movieId]);
    } else if (filteredMovies.length === 1 && filteredMovies.includes(movieId)) {
      // If only one movie is enabled and it's being toggled, enable all movies
      setFilteredMovies(uniqueMovies.map(m => m.id));
    } else {
      // Otherwise, behave as before
      setFilteredMovies(filteredMovies.includes(movieId)
        ? filteredMovies.filter(m => m !== movieId)
        : [...filteredMovies, movieId]);
    }
  };

  const filteredScreenings = screenings.filter(s => filteredMovies.includes(s.movieId));
  return (
    <>
      <Group mb="sm">
        <Title order={2} >Filme</Title>
        {filteredMovies.length < uniqueMovies.length && <Button variant="outline" size="xs" onClick={() => setFilteredMovies(uniqueMovies.map(m => m.id))}>Alle anzeigen</Button>}
      </Group>
      <MovieCarousel movies={uniqueMovies} filteredMovies={filteredMovies} toggleMovie={toggleMovie} />

      <Title order={2} mb="sm">Vorführungen</Title>
      <ScreeningTimetable screenings={filteredScreenings} isCurrentWeek={weekOffset === 0} />
    </>
  );
}
