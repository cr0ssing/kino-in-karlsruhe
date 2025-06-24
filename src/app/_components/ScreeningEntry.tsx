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

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Group, lighten, Popover, PopoverDropdown, PopoverTarget, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";

import type { CombinedScreening } from "./types";
import AddToCalendarButton from "./AddToCalendarButton";

export default function ScreeningEntry({ screening, startHour, hourHeight }: { screening: CombinedScreening, startHour: number, hourHeight: number }) {
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

  const searchParams = new URLSearchParams(useSearchParams());

  function getQueryParams(movieId: number) {
    searchParams.set("movieDetail", movieId + "");
    return searchParams;
  }

  const [popoverOpened, setPopoverOpened] = useState(false);

  return (
    <Popover key={"popover" + screening.id} opened={popoverOpened} onChange={setPopoverOpened}>
      <PopoverTarget key={"popover-target" + screening.id}>
        <Button
          key={screening.id}
          onClick={() => setPopoverOpened(prev => !prev)}
          p="xs"
          ta="center"
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
        </Button>
      </PopoverTarget>
      <PopoverDropdown>
        <Stack gap="xs">
          <Text size="xs" c="dimmed">{screening.startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}{screening.movie.length && ` • ${screening.movie.length} mins`}</Text>
          <Link
            scroll={false}
            prefetch={true}
            href={`?${getQueryParams(screening.movie.id).toString()}`}
            onClick={() => setPopoverOpened(false)}
            style={{
              fontWeight: 700,
            }}
          >
            {screening.movie.title}
          </Link>
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
    </Popover >
  );
}
