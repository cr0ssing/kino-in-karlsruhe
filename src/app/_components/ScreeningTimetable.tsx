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

import { type Dispatch, type SetStateAction, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Box, Button, Center, Chip, Group, Loader, Stack, Text } from '@mantine/core';
import type { Screening, Movie, Cinema } from '@prisma/client';
import dayjs from "dayjs";
import minmax from "dayjs/plugin/minMax";
import { useQueryState, createParser, parseAsArrayOf, parseAsInteger } from "nuqs";

import { useToggle } from "../useToggle";
import type { CombinedScreening } from "./types";
import TimetableHeader from "./TimetableHeader";
import TimetableColumn from "./TimetableColumn";
import CinemaCombobox from "./CinemaCombobox";
import { ViewportSize, ViewportSizeContext } from "./ViewportSizeContext";

dayjs.extend(minmax);

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: Movie, cinema: Cinema }>;
  isCurrentWeek: boolean;
  startOfWeek: Date;
}

const START_HOUR = 9;
const END_HOUR = 24;
const HOUR_HEIGHT = 152;

// group screenings by time slots and assign column positions
function assignScreeningColumns(screenings: CombinedScreening[]) {
  if (screenings.length === 0) return [];

  // Sort screenings by start time
  const sortedScreenings = [...screenings].sort((a, b) =>
    a.startTime.getTime() - b.startTime.getTime()
  );

  // Calculate the time range each screening occupies (in minutes from midnight)
  const screeningRanges = sortedScreenings.map(screening => {
    const startMinutes = screening.startTime.getHours() * 60 + screening.startTime.getMinutes();
    // Use a fixed duration of 15 minutes for layout purposes
    const endMinutes = startMinutes + 15;

    return {
      screening,
      startMinutes,
      endMinutes,
      columnIndex: -1, // Will be assigned later
      totalColumns: 1, // Will be updated later
      columnSpan: 1    // Will be updated later
    };
  });

  // Define the type for a screening range
  type ScreeningRange = typeof screeningRanges[number];

  // Group screenings that overlap in time
  const overlapGroups: ScreeningRange[][] = [];

  // For each screening, find or create an overlap group
  screeningRanges.forEach(current => {
    // Check if this screening overlaps with any existing group
    let foundGroup = false;

    for (const group of overlapGroups) {
      // Check if current screening overlaps with any screening in this group
      const overlapsWithGroup = group.some(existing =>
        // Check for overlap: not (current ends before existing starts OR current starts after existing ends)
        !(current.endMinutes <= existing.startMinutes || current.startMinutes >= existing.endMinutes)
      );

      if (overlapsWithGroup) {
        // Add to this group
        group.push(current);
        foundGroup = true;
        break;
      }
    }

    // If no overlapping group found, create a new one
    if (!foundGroup) {
      overlapGroups.push([current]);
    }
  });

  // Merge groups that share screenings
  let merged = true;
  while (merged) {
    merged = false;

    for (let i = 0; i < overlapGroups.length; i++) {
      for (let j = i + 1; j < overlapGroups.length; j++) {
        // Check if groups share any screenings
        const groupI = overlapGroups[i] ?? [];
        const groupJ = overlapGroups[j] ?? [];

        const sharesScreenings = groupI.some(screeningI =>
          groupJ.some(screeningJ =>
            screeningI.screening.id === screeningJ.screening.id
          )
        );

        if (sharesScreenings) {
          // Merge groups
          const mergedGroup = [...groupI];

          // Add screenings from groupJ that aren't already in mergedGroup
          groupJ.forEach(screeningJ => {
            if (!mergedGroup.some(s => s.screening.id === screeningJ.screening.id)) {
              mergedGroup.push(screeningJ);
            }
          });

          // Replace groupI with mergedGroup and remove groupJ
          overlapGroups[i] = mergedGroup;
          overlapGroups.splice(j, 1);

          merged = true;
          break;
        }
      }

      if (merged) break;
    }
  }

  // For each group, assign column indices
  overlapGroups.forEach(group => {
    // Create columns for this group
    const columns: ScreeningRange[][] = [];

    // Sort by start time within the group
    group.sort((a, b) => a.startMinutes - b.startMinutes);

    // Assign columns within this group
    group.forEach(current => {
      let placed = false;

      // Try to place in an existing column
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex] ?? [];

        // Check if the current screening overlaps with any screening in this column
        const hasOverlap = column.some(existing =>
          !(current.endMinutes <= existing.startMinutes || current.startMinutes >= existing.endMinutes)
        );

        if (!hasOverlap) {
          // No overlap, we can place it in this column
          current.columnIndex = colIndex;
          column.push(current);
          placed = true;
          break;
        }
      }

      // If not placed in any existing column, create a new column
      if (!placed) {
        current.columnIndex = columns.length;
        columns.push([current]);
      }
    });

    // Set totalColumns for all screenings in this group
    const totalColumns = columns.length;

    // Optimize column spans - allow screenings to span multiple columns when possible
    group.forEach(item => {
      // Start with the basic column assignment
      item.totalColumns = totalColumns;
      const startCol = item.columnIndex;

      // Calculate how many columns this screening could potentially span
      let maxSpan = 1;

      // Check each column to the right to see if we can span it
      for (let colIndex = startCol + 1; colIndex < totalColumns; colIndex++) {
        const column = columns[colIndex] ?? [];

        // Check if spanning to this column would create an overlap
        const wouldOverlap = column.some(existing =>
          !(item.endMinutes <= existing.startMinutes || item.startMinutes >= existing.endMinutes)
        );

        if (wouldOverlap) {
          break; // Stop at first overlap
        }

        maxSpan++;
      }

      // Store the column span information
      item.columnSpan = maxSpan;
    });
  });

  // Map back to the original screenings with column information
  return sortedScreenings.map(screening => {
    const screeningWithRange = screeningRanges.find(s => s.screening.id === screening.id)!;

    return {
      ...screening,
      columnIndex: screeningWithRange.columnIndex,
      totalColumns: screeningWithRange.totalColumns,
      columnSpan: screeningWithRange.columnSpan ?? 1
    };
  });
}

export default function ScreeningTimetable({ screenings, isCurrentWeek, startOfWeek }: ScreeningTimetableProps) {
  const cinemas = useMemo(() => new Map<number, Cinema>(screenings.map(s => [s.cinemaId, s.cinema])), [screenings]);
  const startHour = useMemo(() => Math.min(START_HOUR, screenings.reduce((min, s) => Math.min(min, s.startTime.getHours()), 24)), [screenings]);

  const [filteredCinemasQuery, setFilteredCinemasQuery] = useQueryState<number[]>("filteredCinemas",
    parseAsArrayOf(parseAsInteger).withDefault(Array.from(cinemas.keys())));
  const [toggleCinema, cinemaFilter, setCinemaFilter, setAllCinemas] = useToggle(Array.from(cinemas.keys()), () => [filteredCinemasQuery, setFilteredCinemasQuery]);

  useEffect(() => {
    setAllCinemas(Array.from(cinemas.keys()));
  }, [cinemas, setAllCinemas]);

  const combined = new Map<string, CombinedScreening>();
  screenings.filter(s => cinemaFilter.includes(s.cinemaId)).forEach((screening) => {
    const key = `${screening.movieId}-${screening.startTime.getTime()}`;
    if (!combined.has(key)) {
      combined.set(key, {
        ...screening,
        cinemas: [{ name: screening.cinema.name, color: screening.cinema.color, address: screening.cinema.address, properties: screening.properties }],
        columnIndex: 0,
        totalColumns: 1
      });
    } else {
      const existing = combined.get(key)!;
      existing.cinemas.push({ name: screening.cinema.name, color: screening.cinema.color, address: screening.cinema.address, properties: screening.properties });
    }

    return Array.from(combined.values());
  });

  const combinedScreenings = Array.from(combined.values());

  // Modify the grouping logic to use combined screenings with column information
  const groupedByWeekday = combinedScreenings.reduce((acc, screening) => {
    const weekday = screening.startTime.getDay();
    const mondayBasedDay = weekday === 0 ? 6 : weekday - 1;

    acc[mondayBasedDay] ??= [];

    acc[mondayBasedDay].push(screening);
    return acc;
  }, {} as Record<number, typeof combinedScreenings>);

  // Assign columns for each day's screenings
  Object.keys(groupedByWeekday).forEach(day => {
    groupedByWeekday[Number(day)] = assignScreeningColumns(groupedByWeekday[Number(day)]!);
  });

  const viewportSize = useContext(ViewportSizeContext);

  // Weekday headers  
  const isMobile = viewportSize && viewportSize < ViewportSize.tight;
  const isSmall = viewportSize && viewportSize === ViewportSize.small;
  const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
    .map(day => isSmall || viewportSize === ViewportSize.normal || viewportSize === ViewportSize.tight ? day.substring(0, 2) : day)
    .map((day, i) => day + ", " + dayjs(startOfWeek).add(i, 'day').format('DD.MM.'));
  const curDate = isCurrentWeek ? weekdays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]! : "-1";

  const timeLabels = Array.from(
    { length: END_HOUR - startHour },
    (_, i) => `${(startHour + i).toString().padStart(2, '0')}:00`
  );

  const mondayBasedDayIndex = isCurrentWeek ? new Date().getDay() === 0 ? 6 : new Date().getDay() - 1 : 0;
  const [selectedDayQuery, setSelectedDayQuery] = useQueryState<"auto" | number>("selectedDay", createParser<"auto" | number>({
    parse: (value) => {
      if (value === "auto") return "auto";
      const parsed = parseInt(value);
      if (isNaN(parsed)) return null;
      return parsed;
    },
    serialize: (value) => value.toString(),
  }).withDefault("auto"));

  const [selectedDay, setSelectedDayInternal] = useState(-1);

  const setSelectedDay: Dispatch<SetStateAction<number>> = useCallback((args: number | ((old: number) => number)) => {
    setSelectedDayInternal(args);
    void setSelectedDayQuery(args as number | "auto" | ((old: number | "auto") => number | "auto" | null) | null);
  }, [setSelectedDayQuery]);

  useLayoutEffect(() => {
    if (selectedDayQuery === "auto") {
      if (isMobile) {
        void setSelectedDay(mondayBasedDayIndex);
      } else {
        void setSelectedDayInternal(-1);
      }
    } else {
      void setSelectedDayInternal(selectedDayQuery);
    }
  }, [isMobile, mondayBasedDayIndex, setSelectedDay, selectedDay, selectedDayQuery, setSelectedDayQuery]);

  // Filter weekdays based on selection
  const displayedWeekdays = selectedDay === -1
    ? weekdays
    : [weekdays[selectedDay]!];
  const curDateIndex = displayedWeekdays.indexOf(curDate);

  return (
    !viewportSize ?
      <Center><Loader /></Center>
      : <Stack>
        {isSmall ?
          <Group align="end">
            <CinemaCombobox
              cinemas={Array.from(cinemas).map(([id, cinema]) => ({ ...cinema, enabled: cinemaFilter.includes(id) }))}
              toggleCinema={toggleCinema}
            />
            {cinemaFilter.length < cinemas.size &&
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setCinemaFilter(Array.from(cinemas.keys()));
                }}>
                Alle anzeigen
              </Button>}
          </Group> :
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
        }
        <Box
          pos='relative'
          bd={`1px solid var(--mantine-color-timetable-border)`}
          style={{
            display: 'grid',
            gridTemplateColumns: `60px repeat(${selectedDay === -1 ? 7 : 1}, 1fr)`,
          }}>
          {/* Time labels column */}
          <Stack key="time-labels" gap={0} style={{ gridColumn: '1', borderRight: `1px solid var(--mantine-color-timetable-border)` }}>
            <TimetableHeader
              text="Zeit"
              isToday={false}
              index={-1}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              isMobile={isMobile}
            />
            {timeLabels.map((time) => (
              <Box
                key={time}
                h={HOUR_HEIGHT}
                style={{
                  borderBottom: `1px solid var(--mantine-color-timetable-border)`,
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
                bg={i === curDateIndex ? "var(--mantine-color-timetable-today)" : undefined}
                style={{
                  gridColumn: i + 2,
                  borderRight: i < displayedWeekdays.length - 1 ? `1px solid var(--mantine-color-timetable-border)` : undefined,
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
                  startHour={startHour}
                  endHour={END_HOUR} />
              </Box>
            );
          })}
        </Box>
      </Stack>
  );
}
