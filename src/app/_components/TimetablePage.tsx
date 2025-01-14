/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

"use client";

import { Box, Button, Group, Image, Stack, Title } from "@mantine/core";
import type { Cinema, Movie, Screening } from "@prisma/client";
import ScreeningTimetable from "./ScreeningTimetable";
import MovieCarousel from "./MovieCarousel";
import { useEffect, useMemo, useState } from "react";
import MovieSearchInput from "./MovieSearchInput";

export default function TimetablePage({ screenings, weekOffset }: { screenings: (Screening & { movie: Movie, cinema: Cinema })[], weekOffset: number }) {
  const uniqueMovies = useMemo(() => Array.from(
    new Map(screenings
      .map(screening => [screening.movieId, screening.movie])
    ).values())
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)), [screenings]);
  const [filteredMovies, setFilteredMovies] = useState<number[]>([]);

  // Reset filtered movies whenever screenings/uniqueMovies changes
  useEffect(() => {
    setFilteredMovies(uniqueMovies.map(m => m.id));
  }, [uniqueMovies]);

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

  const [searchIndex, setSearchIndex] = useState(-1);

  const filteredScreenings = useMemo(() => screenings.filter(s => filteredMovies.includes(s.movieId)), [screenings, filteredMovies]);
  return (
    <Stack gap="xl">
      <Box>
        <Group align="center" mb="sm">
          <Group align="center" gap="xs">
            <Image src="/clapperboard.png" alt="Kino in Karlsruhe" h={20} w={20} />
            <Title order={2}>Filme</Title>
          </Group>
          <MovieSearchInput movies={uniqueMovies} scrollToIndex={setSearchIndex} />
          {filteredMovies.length < uniqueMovies.length &&
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setFilteredMovies(uniqueMovies.map(m => m.id));
              }}>
              Alle anzeigen
            </Button>}
        </Group>
        <MovieCarousel searchIndex={searchIndex} movies={uniqueMovies} filteredMovies={filteredMovies} toggleMovie={toggleMovie} />
      </Box>

      <Box>
        <Group align="center" gap="xs" mb="sm">
          <Image src="/movie-night.png" alt="Kino in Karlsruhe" h={20} w={20} />
          <Title order={2}>Vorführungen</Title>
        </Group>
        <ScreeningTimetable screenings={filteredScreenings} isCurrentWeek={weekOffset === 0} />
      </Box>
    </Stack>
  );
}
