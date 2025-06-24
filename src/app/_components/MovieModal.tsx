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
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActionIcon, Badge, Box, Card, CardSection, Center, CloseButton, Divider, Flex, Group, lighten, Loader, LoadingOverlay, ModalContent, ModalOverlay, ModalRoot, Overlay, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useDisclosure, useElementSize, useViewportSize } from "@mantine/hooks";
import { Carousel, CarouselSlide, type Embla } from "@mantine/carousel";
import type { Cinema, Movie, Screening } from "@prisma/client";
import { IconPlayerPlay, IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/plugin/minMax";

import { api } from "~/trpc/react";

import { MoviePosterImage } from "./MoviePoster";
import { ViewportSize, ViewportSizeContext } from "./ViewportSizeContext";
import AddToCalendarModal from "./AddToCalendarModal";

const dayAmount = 8;
const minDays = 7;
const columnWidth = 85;
const headerHeight = 130;
const topOffeset = 150;
const posterBreakpoint = ViewportSize.tight;

export default function MovieModal({ movieId, close }: { movieId: number | null, close: () => void }) {
  const startDate = useMemo(() => dayjs().startOf('day').toDate(), []);

  const { data: movie, isLoading: movieLoading } = api.movie.getById.useQuery({ id: movieId! }, {
    enabled: movieId !== null,
  });

  const { data, isLoading: screeningsLoading, isFetching, fetchNextPage, hasNextPage } = api.screening.getInfiniteScreenings.useInfiniteQuery({
    dayAmount,
    movieId: movieId!
  }, {
    initialCursor: startDate,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: movieId !== null && startDate !== null,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const screeningsByDay = useMemo(() => {
    const screenings = data?.pages.flatMap(page => page.screenings) ?? [];
    const endDate = dayjs.max(screenings.map(s => dayjs(s.startTime)));

    const days = new Map(Array.from({ length: Math.max(dayjs(endDate).diff(startDate, 'day') + 2, minDays) })
      .map((_, i) => dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'))
      .map(day => [day, [] as typeof screenings]));

    screenings?.forEach(screening => days.get(dayjs(screening.startTime).format('YYYY-MM-DD'))?.push(screening));

    const screeningsByDay: [string, typeof screenings][] = [];

    let onHold = [];
    for (const entry of days.entries()) {
      if (entry[1].length === 0) {
        onHold.push(entry);
      } else {
        if (onHold.length >= dayAmount) {
          // push placeholder
          screeningsByDay.push(["Placeholder", []]);
        } else {
          screeningsByDay.push(...onHold);
        }
        screeningsByDay.push(entry);
        onHold = [];
      }
    }
    while (screeningsByDay.length < minDays && onHold.length > 0) {
      screeningsByDay.push(onHold.shift()!);
    }
    return screeningsByDay;
  }, [data, startDate]);

  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const viewportSize = useContext(ViewportSizeContext);
  const [scrollY, setScrollY] = useState(0);
  const { ref: posterRef, height: posterHeight } = useElementSize();
  const carouselHeight = useMemo(() => {
    // elements are 85px tall gap is 9px tall. header is 25px
    return 25 + Math.max(...screeningsByDay.map(([_, screenings]) => screenings?.length ?? 0)) * 94;
  }, [screeningsByDay]);

  const { ref: modalRef, height: modalHeight } = useElementSize();

  const getHeight = useCallback(() =>
    !viewportSize || viewportSize >= posterBreakpoint
      ? Math.max(carouselHeight + 222, posterHeight + 66) - topOffeset
      : Math.max(carouselHeight + 222, viewportHeight) - topOffeset,
    [carouselHeight, posterHeight, viewportHeight, viewportSize]
  );

  const [embla, setEmbla] = useState<Embla | null>(null);

  const [firstSlide, setFirstSlide] = useState<boolean>(true);
  const [lastSlide, setLastSlide] = useState<boolean>(false);

  const onScroll = useCallback((index: number) => {
    if (embla) {
      const slidesInView = embla.slidesInView();
      let wait: Promise<unknown> = Promise.resolve();
      if (hasNextPage && slidesInView.includes(screeningsByDay.length - 1)) {
        wait = fetchNextPage();
      }
      void wait.then(() => {
        setFirstSlide(index === 0);
        setLastSlide(slidesInView.includes(screeningsByDay.length - 1) && !hasNextPage);
      });
    }
  }, [hasNextPage, embla, fetchNextPage, screeningsByDay.length]);

  useEffect(() => {
    if (embla) {
      embla.scrollTo(0);
    }
    setFirstSlide(true);
    setLastSlide((embla?.slidesInView().includes(screeningsByDay.length - 1) ?? false) && !hasNextPage);
    // effect should not run on hasNextPage or screeningsByDay.length change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embla, movie]);

  const handleNext = useCallback(() => embla?.scrollNext(), [embla]);
  const handlePrev = useCallback(() => embla?.scrollPrev(), [embla]);

  const carouselControlTop = useMemo(() => {
    return (modalHeight - Math.min(scrollY, 130) + headerHeight + 34) / 2;
  }, [modalHeight, scrollY]);

  const [isClandarOpen, { open: openCalendar, close: closeCalendar }] = useDisclosure(false);
  const [screening, setScreening] = useState<Screening & { movie: Movie, cinema: Cinema } | null>(null);

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
      {screening && <AddToCalendarModal
        isOpen={isClandarOpen}
        close={closeCalendar}
        screening={screening}
        cinema={screening.cinema}
        properties={screening.properties}
      />}
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
                    {movie.tmdbId &&
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
                      </Badge>}
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

            {screeningsLoading ?
              <Center><Loader mt="sm" /></Center> :
              <Flex justify="center" ml="md" mr="md" gap="xs">
                {screeningsByDay.length > 0 ?
                  <>
                    <ActionIcon pos="sticky" top={carouselControlTop} disabled={firstSlide} onClick={handlePrev}><IconChevronLeft /></ActionIcon>
                    <Carousel
                      align="start"
                      slidesToScroll={1}
                      slideSize={columnWidth}
                      draggable
                      dragFree={false}
                      slideGap="10px"
                      maw="calc(100% - 80px)"
                      withIndicators={false}
                      withControls={false}
                      getEmblaApi={setEmbla}
                      // style={{ flex: 1 }} // makes the carousel not fit to its size
                      onSlideChange={onScroll}
                    >
                      {screeningsByDay.map(([day, screenings], index) => {
                        return (
                          <CarouselSlide key={"slide-" + index}>
                            <Stack key={"day-" + index} gap="xs">
                              {day === "Placeholder" ?
                                <Text ta="center" fw={700} w={columnWidth}>...</Text>
                                : <>
                                  {/* TODO make headers sticky */}
                                  <Text pos="sticky" top={0} key={"day-" + day} ta="center" fw={700} w={columnWidth}>
                                    {dayjs(day).locale('de').format('dd, DD.MM.')}
                                  </Text>
                                  {screenings?.map(screening => {
                                    return <Card
                                      key={"screening-" + screening.id}
                                      withBorder
                                      w={columnWidth}
                                      c="black"
                                      bg={lighten(screening.cinema.color, .6)}
                                      style={{
                                        cursor: "pointer",
                                      }}
                                      onClick={() => {
                                        setScreening(screening);
                                        openCalendar();
                                      }}
                                    >
                                      <CardSection p="xs">
                                        <Stack align="center" gap={0}>
                                          <Text ta="center" fw={500}>{dayjs(screening.startTime).format('HH:mm')}</Text>
                                          <Text ta="center" fz="xs">{screening.cinema.name}</Text>
                                          <Tooltip
                                            label={screening.properties.length > 0 ? screening.properties.join(', ') : 'Vorführung hat keine besonderen Eigenschaften'}
                                          >
                                            <Text ta="center" fz="xs" lineClamp={1}>
                                              {screening.properties.length > 0 ? screening.properties.join(', ') : '-'}
                                            </Text>
                                          </Tooltip>
                                        </Stack>
                                      </CardSection>
                                    </Card>
                                  })}
                                </>
                              }
                            </Stack>
                          </CarouselSlide>
                        )
                      })}
                      <LoadingOverlay overlayProps={{ center: true }} visible={isFetching} />
                    </Carousel>

                    <ActionIcon pos="sticky" top={carouselControlTop} disabled={lastSlide} onClick={handleNext}><IconChevronRight /></ActionIcon>
                  </>
                  : <Text fz="lg" style={{ zIndex: 0 }}>Keine bevorstehenden Vorführungen gefunden.</Text>}
              </Flex>
            }
          </Stack>
        </Group>
      </ModalContent>}
    </ModalRoot >;
}
