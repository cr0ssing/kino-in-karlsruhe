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

import { ActionIcon, Button, em, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { api } from "~/trpc/react";
import Title from "./Title";

export default function WeekNavigation({ weekOffset, startDate, endDate }: { weekOffset: number, startDate: Date, endDate: Date }) {
  const router = useRouter();
  const isMobile = useMediaQuery(`(max-width: ${em(900)})`);

  // Format dates for display
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: isMobile ? "2-digit" : "numeric"
  });

  const iconSize = 16;

  const dateRange = `${dateFormatter.format(startDate)} - ${dateFormatter.format(endDate)}`;

  const globalDateRangeStaleTime = useMemo(() => dayjs().add(1, "day").hour(2).diff(), []);
  const { data: globalDateRange } = api.screening.getDateRange.useQuery(undefined, { staleTime: globalDateRangeStaleTime });
  const { minDate, maxDate } = globalDateRange ?? {};

  const enabledPreviousWeek = minDate && dayjs(minDate).isBefore(startDate);
  const enabledNextWeek = maxDate && dayjs(maxDate).isAfter(endDate);

  function navigate(direction: "previous" | "next") {
    router.push(`/?weekOffset=${weekOffset + (direction === "previous" ? -1 : 1)}`, { scroll: false });
  }

  return (
    <Stack
      align="center"
      pos="sticky"
      top={0}
      mb="lg"
      bg="var(--mantine-color-body)"
      style={{ zIndex: 1000, borderBottom: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Title />
      <Group justify="center" wrap="nowrap" mr="xl" ml="xl" mb="xs">
        <Tooltip label="Vorherige Woche" disabled={!isMobile}>
          {isMobile
            ? <ActionIcon variant="subtle" onClick={() => navigate("previous")} disabled={!enabledPreviousWeek}>
              <IconChevronLeft size={iconSize} />
            </ActionIcon>
            : <Button
              disabled={!enabledPreviousWeek}
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
            ? <ActionIcon variant="subtle" onClick={() => navigate("next")} disabled={!enabledNextWeek}>
              <IconChevronRight size={iconSize} />
            </ActionIcon>
            : <Button
              onClick={() => navigate("next")}
              variant="subtle"
              rightSection={<IconChevronRight size={iconSize} />}
              disabled={!enabledNextWeek}
            >
              Nächste Woche
            </Button>
          }
        </Tooltip>
      </Group>
    </Stack>
  );
}
