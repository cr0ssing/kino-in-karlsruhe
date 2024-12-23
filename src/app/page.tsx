import { Container } from "@mantine/core";
import dayjs from "dayjs";
import "dayjs/locale/de";

import { api, HydrateClient } from "~/trpc/server";
import WeekNavigation from "./_components/WeekNavigation";
import TimetablePage from "./_components/TimetablePage";

export default async function Home({ searchParams }: { searchParams: { weekOffset?: string } }) {

  // Get week offset from URL params (default to 0)
  // eslint-disable-next-line @typescript-eslint/await-thenable
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
