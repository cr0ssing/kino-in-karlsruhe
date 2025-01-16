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

"use client"

import { Box, Chip, em, Group, Stack, Text } from '@mantine/core';
import type { Screening, Movie, Cinema } from '@prisma/client';
import { useEffect, useState } from 'react';
import type { CombinedScreening } from "./types";
import TimetableHeader from "./TimetableHeader";
import TimetableColumn from "./TimetableColumn";
import { useMediaQuery } from "@mantine/hooks";
import { useToggle } from "../useToggle";
import dayjs from "dayjs";
import minmax from "dayjs/plugin/minMax";

dayjs.extend(minmax);

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: Movie, cinema: Cinema }>;
  isCurrentWeek: boolean;
  startOfWeek: Date;
}

const START_HOUR = 9;
const END_HOUR = 24;
const HOUR_HEIGHT = 250;

export default function ScreeningTimetable({ screenings, isCurrentWeek, startOfWeek }: ScreeningTimetableProps) {
  const [cinemas, setCinemas] = useState<Map<number, Cinema>>(new Map());
  const [toggleCinema, cinemaFilter, setCinemaFilter] = useToggle(Array.from(cinemas.keys()));

  useEffect(() => {
    const newCinemas = new Map<number, Cinema>();
    screenings.forEach(s => newCinemas.set(s.cinemaId, s.cinema));
    setCinemas(newCinemas);
  }, [screenings]);

  useEffect(() => {
    setCinemaFilter(Array.from(cinemas.keys()));
  }, [cinemas, setCinemaFilter]);

  const combined = new Map<string, CombinedScreening>();
  screenings.filter(s => cinemaFilter.includes(s.cinemaId)).forEach((screening) => {
    const key = `${screening.movieId}-${screening.startTime.getTime()}`;
    if (!combined.has(key)) {
      combined.set(key, {
        ...screening,
        cinemas: [{ name: screening.cinema.name, color: screening.cinema.color, properties: screening.properties }],
        columnIndex: 0,
        totalColumns: 1
      });
    } else {
      const existing = combined.get(key)!;
      existing.cinemas.push({ name: screening.cinema.name, color: screening.cinema.color, properties: screening.properties });
    }

    return Array.from(combined.values());
  });

  const combinedScreenings = Array.from(combined.values());

  // Add function to group screenings by time slots and assign column positions
  function assignScreeningColumns(screenings: CombinedScreening[]) {
    // Group screenings that start within 15 minutes of each other
    const timeSlots = new Map<number, { screenings: typeof screenings, linkedSlots: number[] }>();

    screenings.forEach(screening => {
      const timeKey = Math.floor(
        (screening.startTime.getHours() * 60 + screening.startTime.getMinutes()) / 15
      );

      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, { screenings: [], linkedSlots: [] });
      }
      const slot = timeSlots.get(timeKey)!;
      slot.screenings.push(screening);

      if (screening.startTime.getMinutes() % 15 !== 0) {
        // this screening must not use column of the following time slot
        // the two slots need to have the same amount of colunms
        const secSlotKey = timeKey + 1;
        const index = slot.screenings.length - 1;
        if (!timeSlots.has(secSlotKey)) {
          timeSlots.set(secSlotKey, { screenings: [], linkedSlots: [] });
        }
        const secSlot = timeSlots.get(secSlotKey)!;
        secSlot.screenings.push({ ...screening, blockColumn: index });
        slot.linkedSlots.push(secSlotKey);
        secSlot.linkedSlots.push(timeKey);
      }
    });

    timeSlots.forEach(({ screenings }) => {
      screenings.map((s, i) => [s, i] as const).filter(([s]) => !!s.blockColumn).forEach(([s, i]) => {
        if (s.blockColumn! !== i) {
          screenings.splice(screenings.indexOf(s), 1);
          screenings.splice(s.blockColumn!, 0, s);
        }
      });
    });

    // Assign column index to each screening
    return screenings.map(screening => {
      const timeKey = Math.floor(
        (screening.startTime.getHours() * 60 + screening.startTime.getMinutes()) / 15
      );
      const sameTimeScreenings = timeSlots.get(timeKey)!;
      const columnIndex = sameTimeScreenings.screenings.findIndex(s => s.id === screening.id);
      const totalColumns = Math.max(
        ...sameTimeScreenings.linkedSlots.map(k => timeSlots.get(k)!.screenings.length),
        sameTimeScreenings.screenings.length
      );

      return {
        ...screening,
        columnIndex,
        totalColumns,
      };
    });
  }

  // Modify the grouping logic to use combined screenings with column information
  const groupedByWeekday = combinedScreenings.reduce((acc, screening) => {
    const weekday = screening.startTime.getDay();
    const mondayBasedDay = weekday === 0 ? 6 : weekday - 1;
    if (!acc[mondayBasedDay]) {
      acc[mondayBasedDay] = [];
    }
    acc[mondayBasedDay].push(screening);
    return acc;
  }, {} as Record<number, typeof combinedScreenings>);

  // Assign columns for each day's screenings
  Object.keys(groupedByWeekday).forEach(day => {
    groupedByWeekday[Number(day)] = assignScreeningColumns(groupedByWeekday[Number(day)]!).filter(s => !s.blockColumn);
  });

  // Weekday headers  
  const isMobile = useMediaQuery(`(max-width: ${em(900)})`);
  const isNarrow = useMediaQuery(`(max-width: ${em(1450)})`);
  const isSmall = useMediaQuery(`(max-width: ${em(400)})`);
  const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
    .map(day => isSmall || isNarrow && !isMobile ? day.substring(0, 2) : day)
    .map((day, i) => day + ", " + dayjs(startOfWeek).add(i, 'day').format('DD.MM.'));
  const curDate = isCurrentWeek ? weekdays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]! : "-1";

  const timeLabels = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => `${(START_HOUR + i).toString().padStart(2, '0')}:00`
  );

  // Add state for selected day (-1 means show all days)
  const mondayBasedDayIndex = isCurrentWeek ? new Date().getDay() === 0 ? 6 : new Date().getDay() - 1 : 0;


  useEffect(() => {
    if (isMobile) {
      setSelectedDay(mondayBasedDayIndex);
    }
  }, [isMobile, mondayBasedDayIndex]);

  const [selectedDay, setSelectedDay] = useState(-1);
  // Filter weekdays based on selection
  const displayedWeekdays = selectedDay === -1
    ? weekdays
    : [weekdays[selectedDay]!];
  const curDateIndex = displayedWeekdays.indexOf(curDate);

  return (
    <Stack>
      <Group gap="xs">
        {Array.from(cinemas).sort((a, b) => a[1].name.localeCompare(b[1].name))
          .map(([id, cinema]) => ({ ...cinema, enabled: cinemaFilter.includes(id) }))
          .map(({ id, name, color, enabled }) =>
            <Chip
              key={"cinema-filter-chip-" + name}
              color={color}
              variant="light"
              checked={enabled}
              size="xs"
              onClick={() => toggleCinema(id)}
            >
              {name}
            </Chip>
          )}
      </Group>
      <Box
        pos='relative'
        style={{
          display: 'grid',
          gridTemplateColumns: `60px repeat(${selectedDay === -1 ? 7 : 1}, 1fr)`,
          borderTop: '1px solid var(--mantine-color-gray-3)',
        }}>
        {/* Time labels column */}
        <Stack key="time-labels" gap={0} style={{ gridColumn: '1', borderRight: '1px solid var(--mantine-color-gray-3)' }}>
          <TimetableHeader text="Zeit" isToday={false} index={-1} selectedDay={selectedDay} setSelectedDay={setSelectedDay} isMobile={isMobile} />
          {timeLabels.map((time) => (
            <Box
              key={time}
              h={HOUR_HEIGHT}
              style={{
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                padding: '4px',
              }}
            >
              <Text size="xs" ta="center">{time}</Text>
            </Box>
          ))}
        </Stack>

        {/* Days columns */}
        {displayedWeekdays.map((day, i) => {
          return (
            <Box
              key={"column" + day}
              pos="relative"
              bg={i === curDateIndex ? 'var(--mantine-color-gray-1)' : undefined}
              style={{
                gridColumn: i + 2,
                borderRight: i < displayedWeekdays.length - 1 ? '1px solid var(--mantine-color-gray-3)' : undefined,
              }}
            >
              <TimetableHeader
                key={"column-header" + day}
                text={day}
                isToday={i === curDateIndex}
                index={weekdays.indexOf(day)}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                isMobile={isMobile} />
              <TimetableColumn
                key={"column-body" + day}
                day={day}
                timeLabels={timeLabels}
                screenings={groupedByWeekday[weekdays.indexOf(day)] ?? []}
                hourHeight={HOUR_HEIGHT}
                startHour={START_HOUR}
                endHour={END_HOUR} />
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
