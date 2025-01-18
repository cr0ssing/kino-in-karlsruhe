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

import { Box, Button, Group, Image, Stack, Switch, Title } from "@mantine/core";
import type { Cinema, Movie, Screening } from "@prisma/client";
import ScreeningTimetable from "./ScreeningTimetable";
import MovieCarousel from "./MovieCarousel";
import { use, useEffect, useMemo, useState } from "react";
import MovieSearchInput from "./MovieSearchInput";
import { useToggle } from "../useToggle";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

type TimetablePageProps = {
  screenings: Promise<(Screening & { movie: Movie, cinema: Cinema })[]>,
  startOfWeek: Date,
  endOfWeek: Date
};

export default function TimetablePage({ screenings: screeningsPromise, startOfWeek, endOfWeek }: TimetablePageProps) {
  const [showNewMovies, setShowNewMovies] = useState(false);

  const isCurrentWeek = dayjs().isBetween(startOfWeek, endOfWeek);

  const screenings = use(screeningsPromise);

  const filteredByNewScreenings = useMemo(() => screenings.filter(s => !showNewMovies
    || s.movie.releaseDate && dayjs(startOfWeek).diff(dayjs(s.movie.releaseDate), "days") < 4),
    [screenings, showNewMovies, startOfWeek]);

  const uniqueMovies = useMemo(() => Array.from(
    new Map(filteredByNewScreenings
      .map(screening => [screening.movieId, screening.movie])
    ).values()).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)),
    [filteredByNewScreenings]);

  const [toggleMovie, filteredMovies, setFilteredMovies] = useToggle(uniqueMovies.map(m => m.id));

  // Reset filtered movies whenever screenings/uniqueMovies changes
  useEffect(() => {
    setFilteredMovies(uniqueMovies.map(m => m.id));
  }, [uniqueMovies, setFilteredMovies]);

  const [searchIndex, setSearchIndex] = useState(-1);

  const filteredScreenings = useMemo(() => filteredByNewScreenings.filter(s => filteredMovies.includes(s.movieId)),
    [filteredByNewScreenings, filteredMovies]);

  return (
    <Stack gap="xl">
      <Box>
        <Group align="center" mb="sm">
          <Group align="center" gap="xs">
            <Image src="/clapperboard.png" alt="Kino in Karlsruhe" h={20} w={20} />
            <Title order={2}>Filme</Title>
          </Group>
          <MovieSearchInput movies={uniqueMovies} scrollToIndex={setSearchIndex} />
          <Switch
            checked={showNewMovies}
            onChange={e => setShowNewMovies(e.target.checked)}
            label="Zeige nur Neuerscheinungen"
          />
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
        <ScreeningTimetable screenings={filteredScreenings} isCurrentWeek={isCurrentWeek} startOfWeek={startOfWeek} />
      </Box>
    </Stack>
  );
}
