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
import { Carousel, CarouselSlide, type Embla } from "@mantine/carousel";
import { ActionIcon, Card, CardSection, Center, Flex, lighten, Loader, LoadingOverlay, Stack, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { Cinema, Movie, Screening } from "~/../prisma/generated/prisma/client";
import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/plugin/minMax";

import { api } from "~/trpc/react";
import AddToCalendarModal from "./AddToCalendarModal";


const dayAmount = 8;
const minDays = 7;
const columnWidth = 85;
const headerHeight = 130;


export default function ScreeningCarousel({ movieId, startDate, modalHeight, onHeightUpdated }: { movieId?: number, startDate: Date, modalHeight: number, onHeightUpdated: (height: number) => void }) {
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

  const [scrollY] = useState(0);

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
  }, [embla, movieId]);

  const handleNext = useCallback(() => embla?.scrollNext(), [embla]);
  const handlePrev = useCallback(() => embla?.scrollPrev(), [embla]);

  const carouselControlTop = useMemo(() => {
    return (modalHeight - Math.min(scrollY, 130) + headerHeight + 34) / 2;
  }, [modalHeight, scrollY]);

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
      </Flex>}
  </>
}
