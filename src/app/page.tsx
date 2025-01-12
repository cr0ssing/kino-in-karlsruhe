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

import { Center, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/de";

import { api, HydrateClient } from "~/trpc/server";
import WeekNavigation from "./_components/WeekNavigation";
import TimetablePage from "./_components/TimetablePage";
import Footer from "./_components/Footer";
import Title from "./_components/Title";

export default async function Home({ searchParams }: { searchParams: Promise<{ weekOffset?: string }> }) {

  // Get week offset from URL params (default to 0)
  const weekOffset = parseInt((await searchParams).weekOffset ?? "0");

  // Get this week's date range
  const startOfWeek = dayjs().locale("de").startOf("week").add(weekOffset, "week").toDate();
  const endOfWeek = dayjs().locale("de").endOf("week").add(weekOffset, "week").toDate();

  // Fetch screenings for this week
  const screenings = await api.screening.getAll({
    dateFrom: startOfWeek,
    dateTo: endOfWeek,
  });

  return (
    <HydrateClient>
      <Title />
      <Stack m="xl" mb="md" gap="lg">
        <WeekNavigation weekOffset={weekOffset} startDate={startOfWeek} endDate={endOfWeek} />
        <TimetablePage screenings={screenings} weekOffset={weekOffset} />
        <Center><Text size="xs" c="dimmed">Alle Angaben ohne Gewähr</Text></Center>
      </Stack>
      <Footer />
    </HydrateClient>
  );
}
