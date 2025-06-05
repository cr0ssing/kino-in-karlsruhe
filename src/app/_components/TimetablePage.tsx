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

import { use, useEffect, useMemo, useState } from "react";
import { Box, Button, Group, Image, Stack, Switch, Title, Transition, ActionIcon, Tooltip } from "@mantine/core";
import { useDisclosure, useViewportSize } from "@mantine/hooks";
import type { Cinema, Movie, Screening } from "@prisma/client";
import PullToRefresh from 'pulltorefreshjs';
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { useToggle } from "../useToggle";
import ScreeningTimetable from "./ScreeningTimetable";
import MovieCarousel from "./MovieCarousel";
import MovieGrid from "./MovieGrid";
import MovieSearchInput from "./MovieSearchInput";
import FilterButton from "./FilterButton";
import { getViewportSize, ViewportSize, ViewportSizeContext } from "./ViewportSizeContext";
import pullToRefreshStyles from "./pulltorefreshStyles";
import MovieModal from "./MovieModal";

dayjs.extend(isBetween);

type TimetablePageProps = {
  screenings: Promise<(Screening & { movie: Movie, cinema: Cinema })[]>,
  startOfWeek: Date,
  endOfWeek: Date
};

export default function TimetablePage({ screenings: screeningsPromise, startOfWeek, endOfWeek }: TimetablePageProps) {
  const router = useRouter();

  useEffect(() => {
    // https://stackoverflow.com/a/78773384
    // if we're on iOS in standalone mode, add support for pull to refresh
    // @ts-expect-error typescript doesn't recognize the non-standard standalone property as it only exists on iOS
    const isInWebAppiOS = (window.navigator.standalone === true);
    if (isInWebAppiOS) {
      PullToRefresh.init({
        mainElement: 'body',
        instructionsPullToRefresh: "Nach unten ziehen zum Aktualisieren",
        instructionsReleaseToRefresh: "Loslassen zum Aktualisieren",
        instructionsRefreshing: "Aktualisiere...",
        onRefresh: () => router.refresh(),
        getStyles: () => pullToRefreshStyles,
      });
    }
  }, [router]);

  const [showNewMovies, setShowNewMovies] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [openedMovie, setOpenedMovie] = useState<number | null>(null);

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

  const movieSearch = <MovieSearchInput movies={uniqueMovies} scrollToIndex={setSearchIndex} />;
  const newSwitch = <Switch
    checked={showNewMovies}
    onChange={e => setShowNewMovies(e.target.checked)}
    label="Zeige nur Neuerscheinungen"
  />;

  const [showFilters, { toggle: toggleFilters }] = useDisclosure(false);

  const { width: viewportWidth } = useViewportSize();
  const viewportSize = getViewportSize(viewportWidth);

  const moviesById = useMemo(() => new Map(uniqueMovies.map(movie => [movie.id, movie])), [uniqueMovies]);

  return (
    <ViewportSizeContext.Provider value={viewportSize}>
      <Stack gap="xs">
        <Box>
          <Group align="center" mb="sm">
            <Group align="center" gap="xs">
              <Image src="/clapperboard.png" alt="Kino in Karlsruhe" h={20} w={20} />
              <Title order={2}>Filme</Title>
            </Group>
            {viewportSize && viewportSize < ViewportSize.narrow
              ? <FilterButton showFilters={showFilters} toggleFilters={toggleFilters} />
              : <>
                {movieSearch}
                {newSwitch}
              </>}
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
          {viewportSize && viewportSize < ViewportSize.narrow &&
            <Transition mounted={showFilters} transition="fade-up" keepMounted timingFunction="ease" duration={200}>
              {styles => <Stack mb="md" style={styles}>
                {movieSearch}
                {newSwitch}
              </Stack>}
            </Transition>}
          {showGrid ? (
            <MovieGrid
              movies={uniqueMovies}
              filteredMovies={filteredMovies}
              toggleMovie={toggleMovie}
              openMovieModal={setOpenedMovie}
            />
          ) : (
            <MovieCarousel
              searchIndex={searchIndex}
              movies={uniqueMovies}
              filteredMovies={filteredMovies}
              toggleMovie={toggleMovie}
              setOpenedMovie={setOpenedMovie}
            />
          )}
          <Group justify="center" mt="sm">
            <Tooltip label={showGrid ? "Filme einklappen" : "Zeige alle Filme"}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setShowGrid(!showGrid)}
              >
                {showGrid ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
          <MovieModal
            movie={openedMovie !== null ? moviesById.get(openedMovie)! : null}
            close={() => setOpenedMovie(null)}
          />
        </Box>

        <Box>
          <Group align="center" gap="xs" mb="sm">
            <Image src="/movie-night.png" alt="Kino in Karlsruhe" h={20} w={20} />
            <Title order={2}>Vorführungen</Title>
          </Group>
          <ScreeningTimetable screenings={filteredScreenings} isCurrentWeek={isCurrentWeek} startOfWeek={startOfWeek} />
        </Box>
      </Stack>
    </ViewportSizeContext.Provider>
  );
}
