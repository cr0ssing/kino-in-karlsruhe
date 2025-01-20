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

import { ActionIcon, Box, Group, Text, useComputedColorScheme } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import { timetableBorderColors, timetableTodayColors } from "../theme";

type TimetableHeaderProps = {
  text: string;
  index: number;
  selectedDay: number;
  setSelectedDay: Dispatch<SetStateAction<number>>;
  isMobile: boolean | undefined;
  isToday: boolean;
};

export default function TimetableHeader({ text, index, selectedDay, setSelectedDay, isMobile, isToday }: TimetableHeaderProps) {
  const colorScheme = useComputedColorScheme();
  const timetableTodayColor = timetableTodayColors[colorScheme];
  const timetableBorderColor = timetableBorderColors[colorScheme];

  return (
    <Group
      justify="center"
      p="sm"
      top={isMobile ? "57px" : "65px"}
      pos="sticky"
      bg={isToday ? timetableTodayColor : 'var(--mantine-color-body)'}
      style={{
        borderBottom: `1px solid ${timetableBorderColor}`,
        zIndex: 2,
      }}>
      {index !== -1 && selectedDay !== -1 && (
        <ActionIcon
          variant="subtle"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDay((prev: number) => (prev - 1 + 7) % 7);
          }}
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
      )}

      <Box
        style={{ cursor: index === -1 ? undefined : 'pointer' }}
        onClick={() => setSelectedDay(selectedDay === index ? -1 : index)}>
        <Text size="lg" fw={700} ta="center">{text}</Text>
      </Box>

      {index !== -1 && selectedDay !== -1 && (
        <ActionIcon
          variant="subtle"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDay((prev: number) => (prev + 1) % 7);
          }}
        >
          <IconChevronRight size={16} />
        </ActionIcon>
      )}
    </Group>
  )
}
