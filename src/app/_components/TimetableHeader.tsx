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

import { ActionIcon, Box, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

type TimetableHeaderProps = {
  text: string;
  index: number;
  selectedDay: number;
  setSelectedDay: Dispatch<SetStateAction<number>>;
  /** Link to Sunday of the previous week, `null` if there is no previous week */
  previousWeekHref?: string | null;
  /** Link to Monday of the next week, `null` if there is no next week */
  nextWeekHref?: string | null;
  isMobile: boolean | undefined;
  isToday: boolean;
};

const FIRST_DAY = 0;
const LAST_DAY = 6;

export default function TimetableHeader({ text, index, selectedDay, setSelectedDay, previousWeekHref, nextWeekHref, isMobile, isToday }: TimetableHeaderProps) {
  const showArrows = index !== -1 && selectedDay !== -1;

  function dayArrow(direction: "previous" | "next") {
    const icon = direction === "previous" ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />;
    const isWeekBoundary = direction === "previous" ? selectedDay === FIRST_DAY : selectedDay === LAST_DAY;

    if (isWeekBoundary) {
      const href = direction === "previous" ? previousWeekHref : nextWeekHref;
      return href
        ? <ActionIcon variant="subtle" component={Link} href={href} scroll={false} prefetch>
          {icon}
        </ActionIcon>
        : <ActionIcon variant="subtle" disabled>
          {icon}
        </ActionIcon>;
    }

    return (
      <ActionIcon
        variant="subtle"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedDay((prev: number) => prev + (direction === "previous" ? -1 : 1));
        }}
      >
        {icon}
      </ActionIcon>
    );
  }

  return (
    <Group
      justify="center"
      p="sm"
      top={isMobile ? "57px" : "65px"}
      pos="sticky"
      bg={isToday ? "var(--mantine-color-timetable-today)" : 'var(--mantine-color-body)'}
      style={{
        borderBottom: `1px solid var(--mantine-color-timetable-border)`,
        zIndex: 2,
      }}>
      {showArrows && dayArrow("previous")}

      <Box
        style={{ cursor: index === -1 ? undefined : 'pointer' }}
        onClick={() => setSelectedDay(selectedDay === index ? -1 : index)}>
        <Text size="lg" fw={700} ta="center">{text}</Text>
      </Box>

      {showArrows && dayArrow("next")}
    </Group>
  )
}
