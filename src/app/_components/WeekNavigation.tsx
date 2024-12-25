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

import { Button, em, Group, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export default function WeekNavigation({ weekOffset, dateRange }: { weekOffset: number, dateRange: string }) {
  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);

  return (
    <Group justify="center" wrap="nowrap">
      <Tooltip label="Vorherige Woche" disabled={!isMobile}>
        <Button
          component="a"
          href={`/?weekOffset=${weekOffset - 1}`}
          variant="subtle"
          leftSection={<IconChevronLeft size={16} />}
        >
          {isMobile ? '' : 'Vorherige Woche'}
        </Button>
      </Tooltip>

      <Text fw={500}>{dateRange}</Text>

      <Tooltip label="Nächste Woche" disabled={!isMobile}>
        <Button
          component="a"
          href={`/?weekOffset=${weekOffset + 1}`}
          variant="subtle"
          rightSection={<IconChevronRight size={16} />}
        >
          {isMobile ? '' : 'Nächste Woche'}
        </Button>
      </Tooltip>
    </Group>
  );
}