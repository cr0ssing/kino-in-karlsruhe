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

import { Box, Button, Card, Group, lighten, Popover, PopoverDropdown, PopoverTarget, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import type { CombinedScreening } from "./types";
import isoWeekday from "dayjs/plugin/isoWeek";
import AddToCalendarButton from "./AddToCalendarButton";

dayjs.extend(isoWeekday);

type TimetableColumnProps = {
  day: string;
  timeLabels: string[];
  hourHeight: number;
  startHour: number;
  endHour: number;
  screenings: CombinedScreening[];
};

export default function TimetableColumn({ day, timeLabels, screenings, hourHeight, startHour, endHour }: TimetableColumnProps) {
  return (
    <Box key={"column-entries" + day} pos="relative" h={hourHeight * (endHour - startHour)}>
      {timeLabels.map((time, j) => (
        <Box
          key={"segment" + day + time}
          pos="absolute"
          left={0}
          right={0}
          h={hourHeight}
          top={hourHeight * j}
          style={{
            borderBottom: `1px solid var(--mantine-color-timetable-border)`,
          }}
        />
      ))}

      {/* Screenings */}
      {screenings.map((screening) => {
        const hours = screening.startTime.getHours();
        const minutes = screening.startTime.getMinutes();
        const top = (hours - startHour + minutes / 60) * hourHeight;

        // Get the column span (default to 1 if not specified)
        const columnSpan = screening.columnSpan ?? 1;

        // Calculate width and position based on column information
        const columnWidth = 100 / screening.totalColumns;
        const leftRightPadding = 1; // Padding on each side in pixels

        // Calculate the width as a percentage of the container, accounting for column span
        const width = `calc(${columnWidth * columnSpan}% - ${2 * leftRightPadding}px)`;

        // Calculate the left position based on column index
        const left = `calc(${screening.columnIndex * columnWidth}% + ${leftRightPadding}px)`;

        return (
          <Popover key={"popover" + screening.id}>
            <PopoverTarget key={"popover-target" + screening.id}>
              <Card
                component={Button}
                key={screening.id}
                shadow="xs"
                padding="xs"
                radius="sm"
                pos="absolute"
                bg={screening.cinemas.length === 1 ? lighten(screening.cinemas[0]!.color, .6) : "white"}
                top={`${top}px`}
                left={left}
                w={width}
                bd={screening.movie.releaseDate &&
                  dayjs(screening.startTime).diff(dayjs(screening.movie.releaseDate), "days") < 7
                  ? "1px solid var(--mantine-color-yellow-5)"
                  : undefined}
              >
                <Text size="sm" c="black" fw={700} lineClamp={1}>
                  {screening.movie.title}
                </Text>
              </Card>
            </PopoverTarget>
            <PopoverDropdown>
              <Stack gap="xs">
                <Text size="xs" c="dimmed">{screening.startTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{screening.movie.length && ` • ${screening.movie.length} mins`}</Text>
                {/* TODO add link to movie modal use nuqs for showing modal */}
                <Text fw={700}>{screening.movie.title}</Text>
                {screening.cinemas.map(c =>
                  <Group key={screening.id + c.name} gap={6}>
                    <AddToCalendarButton screening={screening} cinema={c} properties={c.properties} />
                    <Group key={screening.id + c.name + "desc"}>
                      <Text size="sm">{c.name}</Text>
                      <Text size="xs" c="dimmed">{c.properties.join(', ')}</Text>
                    </Group>
                  </Group>
                )}
              </Stack>
            </PopoverDropdown>
          </Popover>
        );
      })}
    </Box>
  );
}
