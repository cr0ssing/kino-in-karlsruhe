import { Container } from "@mantine/core";
import dayjs from "dayjs";

import { api, HydrateClient } from "~/trpc/server";
import WeekNavigation from "./_components/WeekNavigation";
import TimetablePage from "./_components/TimetablePage";

export default async function Home({
  searchParams,
}: {
  searchParams: { weekOffset?: string };
}) {

  // Get week offset from URL params (default to 0)
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const weekOffset = parseInt((await searchParams).weekOffset ?? "0");

  // Get this week's date range
  const startOfWeek = new Date();
  // getDay() returns 0-6 where 0 is Sunday, so we need to handle Monday differently
  const currentDay = startOfWeek.getDay();
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday + (weekOffset * 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Format dates for display
  const dateFormatter = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const dateRange = `${dateFormatter.format(startOfWeek)} - ${dateFormatter.format(endOfWeek)}`;

  // Fetch screenings for this week
  const screenings = await api.screening.getAll({
    dateFrom: startOfWeek,
    dateTo: endOfWeek,
  });

  // prefetch next week
  void api.screening.getAll.prefetch({
    dateFrom: dayjs(startOfWeek).add(7, 'day').toDate(),
    dateTo: dayjs(endOfWeek).add(7, 'day').toDate(),
  });

  // prefetch last week
  void api.screening.getAll.prefetch({
    dateFrom: dayjs(startOfWeek).subtract(7, 'day').toDate(),
    dateTo: dayjs(endOfWeek).subtract(7, 'day').toDate(),
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
