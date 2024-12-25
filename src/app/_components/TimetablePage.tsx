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

import { Button, Group, Title } from "@mantine/core";
import type { Cinema, Movie, Screening } from "@prisma/client";
import ScreeningTimetable from "./ScreeningTimetable";
import MovieCarousel from "./MovieCarousel";
import { useMemo, useState } from "react";

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

  const filteredScreenings = useMemo(() => screenings.filter(s => filteredMovies.includes(s.movieId)), [screenings, filteredMovies]);
  return (
    <>
      <Group mb="sm">
        <Title order={2} >Filme</Title>
        {filteredMovies.length < uniqueMovies.length &&
          <Button
            variant="outline"
            size="xs"
            onClick={() => setFilteredMovies(uniqueMovies.map(m => m.id))}>
            Alle anzeigen
          </Button>}
      </Group>
      <MovieCarousel movies={uniqueMovies} filteredMovies={filteredMovies} toggleMovie={toggleMovie} />

      <Title order={2} mb="sm">Vorführungen</Title>
      <ScreeningTimetable screenings={filteredScreenings} isCurrentWeek={weekOffset === 0} />
    </>
  );
}
