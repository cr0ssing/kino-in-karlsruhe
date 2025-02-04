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

import { Suspense } from "react";
import { Center, Flex, Loader, Stack, Text } from "@mantine/core";

import { api, HydrateClient } from "~/trpc/server";
import WeekNavigation from "./_components/WeekNavigation";
import TimetablePage from "./_components/TimetablePage";
import Footer from "./_components/Footer";
import { getWeekDates } from "./getWeekDates";

export default async function Home({ searchParams }: { searchParams: Promise<{ weekOffset?: string }> }) {

  // Get week offset from URL params (default to 0)
  const weekOffset = parseInt((await searchParams).weekOffset ?? "0");

  const { startOfWeek, endOfWeek } = getWeekDates(weekOffset);

  // Fetch screenings for this week
  const screenings = api.screening.getAll({
    dateFrom: startOfWeek,
    dateTo: endOfWeek,
  });

  return (
    <HydrateClient>
      <WeekNavigation weekOffset={weekOffset} startDate={startOfWeek} endDate={endOfWeek} />
      <Suspense key={"timetable-page-" + weekOffset} fallback={<Flex align="center" justify="center" h="84vh"><Loader /></Flex>}>
        <Stack ml="xl" mr="xl" mb="md" gap="lg">
          <TimetablePage key={"timetable-page-" + weekOffset} screenings={screenings} startOfWeek={startOfWeek} endOfWeek={endOfWeek} />
          <Center><Text size="xs" c="dimmed">Alle Angaben ohne Gewähr</Text></Center>
        </Stack>
      </Suspense>
      <Footer />
    </HydrateClient>
  );
}
