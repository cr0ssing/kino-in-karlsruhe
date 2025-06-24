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

import { Box } from "@mantine/core";
import dayjs from "dayjs";
import type { CombinedScreening } from "./types";
import isoWeekday from "dayjs/plugin/isoWeek";

import ScreeningEntry from "./ScreeningEntry";

dayjs.extend(isoWeekday);

type TimetableColumnProps = {
  day: string;
  timeLabels: string[];
  hourHeight: number;
  startHour: number;
  endHour: number;
  screenings: CombinedScreening[];
};

export default function TimetableColumn({ day, timeLabels, screenings, hourHeight, startHour, endHour }: TimetableColumnProps) {
  return (
    <Box key={"column-entries" + day} pos="relative" h={hourHeight * (endHour - startHour)}>
      {timeLabels.map((time, j) => (
        <Box
          key={"segment" + day + time}
          pos="absolute"
          left={0}
          right={0}
          h={hourHeight}
          top={hourHeight * j}
          style={{
            borderBottom: `1px solid var(--mantine-color-timetable-border)`,
          }}
        />
      ))}

      {screenings.map((screening) =>
        <ScreeningEntry key={screening.id} screening={screening} startHour={startHour} hourHeight={hourHeight} />
      )}
    </Box>
  );
}
