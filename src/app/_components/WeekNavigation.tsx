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

import { ActionIcon, Button, em, Group, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function WeekNavigation({ weekOffset, startDate, endDate }: { weekOffset: number, startDate: Date, endDate: Date }) {
  const router = useRouter();

  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);

  // Format dates for display
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: isMobile ? "2-digit" : "numeric"
  });

  const iconSize = 16;

  const dateRange = `${dateFormatter.format(startDate)} - ${dateFormatter.format(endDate)}`;

  function navigate(direction: "previous" | "next") {
    router.push(`/?weekOffset=${weekOffset + (direction === "previous" ? -1 : 1)}`);
  }

  return (
    <Group justify="center" wrap="nowrap">
      <Tooltip label="Vorherige Woche" disabled={!isMobile}>
        {isMobile
          ? <ActionIcon variant="subtle" onClick={() => navigate("previous")}>
            <IconChevronLeft size={iconSize} />
          </ActionIcon>
          : <Button
            onClick={() => navigate("previous")}
            variant="subtle"
            leftSection={<IconChevronLeft size={iconSize} />}
          >
            Vorherige Woche
          </Button>
        }
      </Tooltip>

      <Text fw={500}>{dateRange}</Text>

      <Tooltip label="Nächste Woche" disabled={!isMobile}>
        {isMobile
          ? <ActionIcon variant="subtle" onClick={() => navigate("next")}>
            <IconChevronRight size={iconSize} />
          </ActionIcon>
          : <Button
            onClick={() => navigate("next")}
            variant="subtle"
            rightSection={<IconChevronRight size={iconSize} />}
          >
            Nächste Woche
          </Button>
        }
      </Tooltip>
    </Group>
  );
}