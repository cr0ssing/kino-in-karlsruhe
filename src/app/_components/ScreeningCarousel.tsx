/**
 * Copyright (C) 2025 Robin Lamberti.
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Carousel, CarouselSlide } from "@mantine/carousel";
import { ActionIcon, Card, CardSection, Center, Flex, lighten, Loader, LoadingOverlay, Stack, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { EmblaCarouselType } from "embla-carousel";
import type { Cinema, Movie, Screening } from "~/../prisma/generated/prisma/client";
import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/plugin/minMax";

import { api } from "~/trpc/react";
import AddToCalendarModal from "./AddToCalendarModal";


const dayAmount = 8;
const minDays = 7;
const columnWidth = 85;
const dayHeaderHeight = 25;
const dayGap = 10;
// distance from the top of a day column to its first screening card
const cardsOffset = dayHeaderHeight + dayGap;
const controlSize = 28;


export default function ScreeningCarousel({ movieId, startDate, onHeightUpdated, scrollContainer, stickyHeaderBottom }: {
  movieId?: number,
  startDate: Date,
  onHeightUpdated: (height: number) => void,
  scrollContainer: HTMLElement | null,
  /** bottom edge of the modal's sticky header (relative to the top of the modal) when the modal is scrolled */
  stickyHeaderBottom: number,
}) {
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

  useEffect(() => {
    // elements are 85px tall gap is 9px tall. header is 25px
    onHeightUpdated(25 + Math.max(...screeningsByDay.map(([_, screenings]) => screenings?.length ?? 0)) * 94);
  }, [screeningsByDay, onHeightUpdated]);

  const [embla, setEmbla] = useState<EmblaCarouselType | null>(null);

  const [firstSlide, setFirstSlide] = useState<boolean>(true);
  const [lastSlide, setLastSlide] = useState<boolean>(false);

  const syncControls = useCallback((index: number, api: EmblaCarouselType) => {
    const visibleSlides = api.slidesInView();
    const visibleLastSlide = visibleSlides.includes(screeningsByDay.length - 1);

    setFirstSlide(index === 0);
    setLastSlide(visibleLastSlide && !hasNextPage);
  }, [hasNextPage, screeningsByDay.length]);

  const onScroll = useCallback((index: number) => {
    if (embla) {
      let wait: Promise<unknown> = Promise.resolve();
      if (hasNextPage && embla.slidesInView().includes(screeningsByDay.length - 1)) {
        wait = fetchNextPage();
      }
      void wait.then(() => {
        syncControls(index, embla);
      });
    }
  }, [hasNextPage, embla, fetchNextPage, screeningsByDay.length, syncControls]);

  useEffect(() => {
    if (embla) {
      embla.scrollTo(0);
      requestAnimationFrame(() => {
        syncControls(0, embla);
      });
    }
  }, [embla, movieId, syncControls]);

  useEffect(() => {
    if (embla) {
      requestAnimationFrame(() => {
        syncControls(embla.selectedScrollSnap(), embla);
      });
    }
  }, [embla, hasNextPage, screeningsByDay.length, syncControls]);

  const handleNext = useCallback(() => {
    if (!embla) {
      return;
    }

    const isAtLoadedEnd =
      embla.slidesInView().includes(screeningsByDay.length - 1) || !embla.canScrollNext();

    if (hasNextPage && isAtLoadedEnd) {
      void fetchNextPage().then(() => {
        requestAnimationFrame(() => {
          embla.scrollNext();
          syncControls(embla.selectedScrollSnap(), embla);
        });
      });
      return;
    }

    embla.scrollNext();
  }, [embla, fetchNextPage, hasNextPage, screeningsByDay.length, syncControls]);
  const handlePrev = useCallback(() => embla?.scrollPrev(), [embla]);

  // The controls are centered on the visible part of the screening cards, so they stay in the middle
  // of the screen while scrolling through days with more cards than fit into the modal.
  // They are positioned with `position: sticky`, so the browser keeps them in place while scrolling
  // (scroll events lag behind momentum scrolling on iOS). The sticky offset is only recalculated here,
  // and it stays constant while the cards fill the whole visible area.
  const [rowsElement, setRowsElement] = useState<HTMLDivElement | null>(null);
  const [controlStickyTop, setControlStickyTop] = useState<number | null>(null);

  useEffect(() => {
    if (!rowsElement || !scrollContainer) {
      return;
    }

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rows = rowsElement.getBoundingClientRect();
        const containerTop = scrollContainer.getBoundingClientRect().top + scrollContainer.clientTop;
        const containerBottom = containerTop + scrollContainer.clientHeight;
        const cardsTop = rows.top + cardsOffset;
        // only the days currently shown count, a later day with many screenings shouldn't move the controls
        const visibleDays = embla
          ? embla.slidesInView().map(index => embla.slideNodes()[index]?.firstElementChild).filter(day => !!day)
          : [];
        const cardsBottom = visibleDays.length > 0
          ? Math.max(...visibleDays.map(day => day.getBoundingClientRect().bottom))
          : rows.bottom;
        const visibleTop = Math.max(cardsTop, containerTop + stickyHeaderBottom);
        // days without screenings: keep the controls next to the first row
        const visibleBottom = Math.max(visibleTop + controlSize, Math.min(cardsBottom, containerBottom));
        // round to avoid sub-pixel jitter
        setControlStickyTop(Math.round((visibleTop + visibleBottom) / 2 - containerTop - controlSize / 2));
      });
    };

    update();
    scrollContainer.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(rowsElement);
    resizeObserver.observe(scrollContainer);
    embla?.on("slidesInView", update).on("reInit", update);

    return () => {
      cancelAnimationFrame(frame);
      scrollContainer.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      embla?.off("slidesInView", update).off("reInit", update);
    };
  }, [rowsElement, scrollContainer, stickyHeaderBottom, embla]);

  function carouselControl(direction: "previous" | "next") {
    return (
      // the sticky controls can't leave this wrapper, which spans the screening cards
      <Flex direction="column" pt={cardsOffset} style={{ flexShrink: 0 }}>
        <ActionIcon
          pos="sticky"
          size={controlSize}
          style={{
            top: controlStickyTop ?? 0,
            visibility: controlStickyTop === null ? "hidden" : undefined,
          }}
          disabled={direction === "previous" ? firstSlide : lastSlide}
          onClick={direction === "previous" ? handlePrev : handleNext}
          aria-label={direction === "previous" ? "Vorherige Tage" : "Nächste Tage"}
        >
          {direction === "previous" ? <IconChevronLeft /> : <IconChevronRight />}
        </ActionIcon>
      </Flex>
    );
  }

  const [isCalendarOpen, { open: openCalendar, close: closeCalendar }] = useDisclosure(false);
  const [screening, setScreening] = useState<Screening & { movie: Movie, cinema: Cinema } | null>(null);

  return <>
    {screening && <AddToCalendarModal
      isOpen={isCalendarOpen}
      close={closeCalendar}
      screening={screening}
      cinema={screening.cinema}
      properties={screening.properties}
    />}
    {screeningsLoading ?
      <Center><Loader mt="sm" /></Center> :
      <Flex ref={setRowsElement} justify="center" ml="md" mr="md" gap="xs">
        {screeningsByDay.length > 0 ?
          <>
            {carouselControl("previous")}
            <Carousel
              slideSize={columnWidth}
              slideGap="10px"
              maw="calc(100% - 80px)"
              withIndicators={false}
              withControls={false}
              getEmblaApi={setEmbla}
              emblaOptions={{
                align: "start",
                slidesToScroll: 1,
                dragFree: false,
              }}
              // style={{ flex: 1 }} // makes the carousel not fit to its size
              onSlideChange={onScroll}
            >
              {screeningsByDay.map(([day, screenings], index) => {
                return (
                  <CarouselSlide key={"slide-" + index}>
                    <Stack key={"day-" + index} gap={dayGap}>
                      {day === "Placeholder" ?
                        <Text ta="center" fw={700} w={columnWidth} h={dayHeaderHeight}>...</Text>
                        : <>
                          {/* TODO make headers sticky */}
                          <Text pos="sticky" top={0} key={"day-" + day} ta="center" fw={700} w={columnWidth} h={dayHeaderHeight}>
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

            {carouselControl("next")}
          </>
          : <Text fz="lg" style={{ zIndex: 0 }}>Keine bevorstehenden Vorführungen gefunden.</Text>}
      </Flex>}
  </>
}
