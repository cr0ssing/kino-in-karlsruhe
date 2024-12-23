"use client"

import { Box, em, Stack, Text } from '@mantine/core';
import type { Screening, Movie, Cinema } from '@prisma/client';
import { useEffect, useState } from 'react';
import type { CombinedScreening } from "./types";
import TimetableHeader from "./TimetableHeader";
import { TimetableColumn } from "./TimetableColumn";
import { useMediaQuery } from "@mantine/hooks";

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: Movie, cinema: Cinema }>;
}

const START_HOUR = 9;
const END_HOUR = 24;
const HOUR_HEIGHT = 250;

export function ScreeningTimetable({ screenings }: ScreeningTimetableProps) {
  const combined = new Map<string, CombinedScreening>();

  screenings.forEach((screening) => {
    const key = `${screening.movieId}-${screening.startTime.getTime()}`;
    if (!combined.has(key)) {
      combined.set(key, {
        ...screening,
        cinemas: [{ name: screening.cinema.name, color: screening.cinema.color }],
        columnIndex: 0,
        totalColumns: 1,
      });
    } else {
      const existing = combined.get(key)!;
      existing.cinemas.push({ name: screening.cinema.name, color: screening.cinema.color });
    }

    return Array.from(combined.values());
  });

  const combinedScreenings = Array.from(combined.values());

  // Add function to group screenings by time slots and assign column positions
  function assignScreeningColumns(screenings: typeof combinedScreenings) {
    // Group screenings that start within 15 minutes of each other
    const timeSlots = new Map<number, typeof combinedScreenings>();

    screenings.forEach(screening => {
      const timeKey = Math.floor(
        (screening.startTime.getHours() * 60 + screening.startTime.getMinutes()) / 15
      );

      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, []);
      }
      timeSlots.get(timeKey)!.push(screening);
    });

    // Assign column index to each screening
    return screenings.map(screening => {
      const timeKey = Math.floor(
        (screening.startTime.getHours() * 60 + screening.startTime.getMinutes()) / 15
      );
      const sameTimeScreenings = timeSlots.get(timeKey)!;
      const columnIndex = sameTimeScreenings.indexOf(screening);
      const totalColumns = sameTimeScreenings.length;

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
    groupedByWeekday[Number(day)] = assignScreeningColumns(groupedByWeekday[Number(day)]!);
  });

  // Weekday headers (now starting with Monday)
  const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  const timeLabels = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => `${(START_HOUR + i).toString().padStart(2, '0')}:00`
  );

  // Add state for selected day (-1 means show all days)
  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);
  const mondayBasedDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

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

  return (
    <Box style={{
      display: 'grid',
      gridTemplateColumns: `60px repeat(${selectedDay === -1 ? 7 : 1}, 1fr)`,
      position: 'relative'
    }}>
      {/* Time labels column */}
      <Stack key="time-labels" gap={0} style={{ gridColumn: '1', borderRight: '1px solid var(--mantine-color-gray-3)' }}>
        <TimetableHeader text="Zeit" index={-1} selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
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
            style={{
              gridColumn: i + 2,
              borderRight: i < displayedWeekdays.length - 1 ? '1px solid var(--mantine-color-gray-3)' : undefined,
              position: 'relative',
            }}
          >
            <TimetableHeader
              key={"column-header" + day}
              text={day}
              index={weekdays.indexOf(day)}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay} />
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
  );
}
