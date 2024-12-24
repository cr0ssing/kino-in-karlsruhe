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

import { Box, Card, Group, Popover, PopoverDropdown, PopoverTarget, Stack, Text } from "@mantine/core";
import type { CombinedScreening } from "./types";

type TimetableColumnProps = {
  day: string;
  timeLabels: string[];
  hourHeight: number;
  startHour: number;
  endHour: number;
  screenings: CombinedScreening[];
};

export function TimetableColumn({ day, timeLabels, screenings, hourHeight, startHour, endHour }: TimetableColumnProps) {
  return (
    <Box key={"column-entries" + day} pos="relative" h={hourHeight * (endHour - startHour)}>
      {timeLabels.map((time, j) => (
        <Box
          key={"segment" + day + time}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: hourHeight,
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            top: hourHeight * j,
          }}
        />
      ))}

      {/* Screenings */}
      {screenings.map((screening) => {
        const hours = screening.startTime.getHours();
        const minutes = screening.startTime.getMinutes();
        const top = (hours - startHour + minutes / 60) * hourHeight;

        // Calculate width and position based on column information
        const width = `calc((100% - 8px) / ${screening.totalColumns})`;
        const left = `calc(4px + ${screening.columnIndex} * (100% - 8px) / ${screening.totalColumns})`;

        return (
          <Popover key={"popover" + screening.id}>
            <PopoverTarget key={"popover-target" + screening.id}>
              <Card
                key={screening.id}
                shadow="xs"
                padding="xs"
                radius="sm"
                pos="absolute"
                bg={screening.cinemas.length === 1 ? `${screening.cinemas[0]!.color}11` : undefined}
                top={`${top}px`}
                left={left}
                w={width}
                style={{
                  zIndex: 2,
                  cursor: 'pointer',
                }}
              >
                <Stack gap={2}>
                  <Text size="sm" fw={700} lineClamp={1}>
                    {screening.movie.title}
                  </Text>
                  <Group>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {screening.cinemas.map(c => c.name).join(', ')}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </PopoverTarget>
            <PopoverDropdown>
              <Stack gap="xs">
                <Text size="xs" c="dimmed">{screening.startTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} • {screening.movie.length} mins</Text>
                <Text fw={700}>{screening.movie.title}</Text>
                {screening.cinemas.map(c =>
                  <Group key={screening.id + c.name}>
                    <Text size="sm">{c.name}</Text>
                    <Text size="xs" c="dimmed">{c.properties.join(', ')}</Text>
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
