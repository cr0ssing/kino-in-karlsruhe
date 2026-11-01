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

import { useMemo } from "react";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";

import { api } from "~/trpc/react";

export type WeekDirection = "previous" | "next";

export function useWeekNavigation(weekOffset: number, startDate: Date, endDate: Date) {
  const searchParams = useSearchParams();

  const globalDateRangeStaleTime = useMemo(() => dayjs().add(1, "day").hour(2).diff(), []);
  const { data: globalDateRange } = api.screening.getDateRange.useQuery({}, { staleTime: globalDateRangeStaleTime });
  const { minDate, maxDate } = globalDateRange ?? {};

  const enabledPreviousWeek = !!minDate && dayjs(minDate).isBefore(startDate);
  const enabledNextWeek = !!maxDate && dayjs(maxDate).isAfter(endDate);

  /**
   * Builds the href for the adjacent week. If `selectedDay` is given, that day is selected in the
   * target week, otherwise a single selected day is reset (the "all days" view is kept).
   */
  function weekHref(direction: WeekDirection, selectedDay?: number) {
    const params = new URLSearchParams(searchParams);
    params.set("weekOffset", weekOffset + (direction === "previous" ? -1 : 1) + "");
    if (selectedDay !== undefined) {
      params.set("selectedDay", selectedDay + "");
    } else if (params.get("selectedDay") !== "-1") {
      params.delete("selectedDay");
    }
    return `?${params.toString()}`;
  }

  return { enabledPreviousWeek, enabledNextWeek, weekHref };
}
