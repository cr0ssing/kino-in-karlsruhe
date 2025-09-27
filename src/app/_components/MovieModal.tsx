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
import { useCallback, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Box, Card, CardSection, Center, CloseButton, Divider, Group, Loader, ModalContent, ModalOverlay, ModalRoot, Overlay, Stack, Title } from "@mantine/core";
import { useElementSize, useViewportSize } from "@mantine/hooks";
import { IconPlayerPlay, IconCalendar } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/plugin/minMax";

import { api } from "~/trpc/react";

import { MoviePosterImage } from "./MoviePoster";
import { ViewportSize, ViewportSizeContext } from "./ViewportSizeContext";
import ScreeningCarousel from "./ScreeningCarousel";


const headerHeight = 130;
const topOffeset = 150;
const posterBreakpoint = ViewportSize.tight;


export default function MovieModal({ movieId, close }: { movieId: number | null, close: () => void }) {
  const startDate = useMemo(() => dayjs().startOf('day').toDate(), []);

  const { data: movie, isLoading: movieLoading } = api.movie.getById.useQuery({ id: movieId! }, {
    enabled: movieId !== null,
  });


  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const viewportSize = useContext(ViewportSizeContext);
  const [scrollY, setScrollY] = useState(0);
  const { ref: posterRef, height: posterHeight } = useElementSize();
  const [carouselHeight, setCarouselHeight] = useState(0);

  const { ref: modalRef, height: modalHeight } = useElementSize();

  const getHeight = useCallback(() =>
    !viewportSize || viewportSize >= posterBreakpoint
      ? Math.max(carouselHeight + 222, posterHeight + 66) - topOffeset
      : Math.max(carouselHeight + 222, viewportHeight) - topOffeset,
    [carouselHeight, posterHeight, viewportHeight, viewportSize]
  );

  return movieId !== null &&
    <ModalRoot
      size={Math.min(viewportWidth * 0.8, 1280)}
      opened={movie !== null}
      onClose={close}
      centered
      fullScreen={viewportWidth < 600}
      removeScrollProps={{
        allowPinchZoom: true
      }}
    >
      <ModalOverlay blur={3} backgroundOpacity={0.55} />
      {movieLoading ? <Center><Loader /></Center> : movie && <ModalContent
        ref={modalRef}
        bg={scrollY < headerHeight && movie.backdropUrl
          ? (movie.tmdbId === null
            ? `url(${movie.backdropUrl})`
            : `url(https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${movie.backdropUrl})`)
          : "var(--mantine-color-body)"}
        bgsz={scrollY < headerHeight && movie.backdropUrl ? "cover" : undefined}
        bgr={scrollY < headerHeight && movie.backdropUrl ? "no-repeat" : undefined}
        bgp={scrollY < headerHeight && movie.backdropUrl ? "top -200px left 50%" : undefined}
        onScroll={(e: React.UIEvent<HTMLDivElement>) => setScrollY(e.currentTarget.scrollTop)}
      >
        <Box key="header">
          {scrollY >= headerHeight && <Overlay
            pos="sticky"
            top={0}
            left={0}
            color="var(--mantine-color-body)"
            backgroundOpacity={1}
          />}
          <Overlay
            gradient={"linear-gradient(0deg, var(--mantine-color-body) 13%, rgba(0, 0, 0, 0) 100%)"}
            h={headerHeight + 20}
            style={{
              zIndex: 0,
            }} />
          <Box h={getHeight()} pos="absolute" top={150}
            w="100%"
            bg="var(--mantine-color-body)" />
        </Box>
        <Group
          wrap="nowrap"
          align="start"
          mt="md"
          mb="md"
          gap={0}
        >
          {viewportSize && viewportSize >= posterBreakpoint &&
            <Card ref={posterRef} ml="md" withBorder shadow="xl" w="20%" pos="sticky" top={16}>
              <CardSection>
                <MoviePosterImage aria-label="Poster" posterUrl={movie.posterUrl} title={movie.title} isLocal={movie.tmdbId === null} />
              </CardSection>
            </Card>}
          <Stack
            w={viewportSize && viewportSize >= posterBreakpoint ? "80%" : "100%"}
          >
            <Group mr="md" justify="end" pos="sticky" top={16} style={{ zIndex: 3 }}>
              <CloseButton aria-label="Schließen" c="bright" onClick={close} />
            </Group>
            <Group
              align="end"
              h={headerHeight}
              pos="sticky"
              top={- 50}
              bg={scrollY >= headerHeight ? "var(--mantine-color-body)" : undefined}
              style={{ zIndex: 2 }}
            >
              <Stack flex={1} gap={2}>
                <Stack ml="md" gap={6}>
                  <Group mb={3} gap="xs" pos="sticky" top={16}>
                    {movie.releaseDate &&
                      <Badge aria-label="Startdatum" size="sm" variant="light" leftSection={<IconCalendar size={13} />}>
                        {dayjs(movie.releaseDate).locale('de').format('DD.MM.YYYY')}
                      </Badge>}
                    {movie.length &&
                      <Badge aria-label="Länge" size="sm" variant="light" leftSection={<IconPlayerPlay size={13} />}>
                        {movie.length} Minuten
                      </Badge>}
                    {movie.tmdbId && <>
                      <Badge
                        aria-label="TMDB-Link"
                        size="sm"
                        component={Link}
                        href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                        target="_blank"
                        variant="outline"
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        TMDB
                      </Badge>
                      <Badge
                        aria-label="Letterboxd-Link"
                        size="sm"
                        component={Link}
                        href={`https://letterboxd.com/tmdb/${movie.tmdbId}`}
                        target="_blank"
                        variant="outline"
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        LBXD
                      </Badge>
                    </>}
                  </Group>
                  <Title
                    aria-label="Titel"
                    order={2}
                  >
                    {movie.title}
                  </Title>
                </Stack>
                <Divider />
              </Stack>
            </Group>
            <ScreeningCarousel movieId={movieId} startDate={startDate} modalHeight={modalHeight} onHeightUpdated={setCarouselHeight} />
          </Stack>
        </Group>
      </ModalContent>}
    </ModalRoot >;
}
