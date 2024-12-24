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

import { Container } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/de";

import { api, HydrateClient } from "~/trpc/server";
import WeekNavigation from "./_components/WeekNavigation";
import TimetablePage from "./_components/TimetablePage";

export default async function Home({ searchParams }: { searchParams: Promise<{ weekOffset?: string }> }) {

  // Get week offset from URL params (default to 0)
  const weekOffset = parseInt((await searchParams).weekOffset ?? "0");

  // Get this week's date range
  const startOfWeek = dayjs().locale("de").startOf("week").add(weekOffset, "week").toDate();
  const endOfWeek = dayjs().locale("de").endOf("week").add(weekOffset, "week").toDate();

  // Format dates for display
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const dateRange = `${dateFormatter.format(startOfWeek)} - ${dateFormatter.format(endOfWeek)}`;

  // Fetch screenings for this week
  const screenings = await api.screening.getAll({
    dateFrom: startOfWeek,
    dateTo: endOfWeek,
  });

  return (
    <HydrateClient>
      <Container m="xl" fluid>
        <WeekNavigation weekOffset={weekOffset} dateRange={dateRange} />
        <TimetablePage screenings={screenings} weekOffset={weekOffset} />
      </Container>
    </HydrateClient>
  );
}
