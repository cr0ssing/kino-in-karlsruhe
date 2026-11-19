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

import { useEffect, useState } from "react";
import { Box } from "@mantine/core";

const UPDATE_INTERVAL_MS = 60 * 1000;
const DOT_SIZE = 10;

/** Horizontal line marking the current time in the timetable column of today. */
export default function CurrentTimeIndicator({ startHour, endHour, hourHeight }: { startHour: number, endHour: number, hourHeight: number }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const hours = now.getHours() + now.getMinutes() / 60;
  if (hours < startHour || hours >= endHour) {
    return null;
  }

  return (
    <Box
      data-testid="current-time-line"
      aria-hidden
      pos="absolute"
      left={0}
      right={0}
      top={(hours - startHour) * hourHeight}
      h={2}
      bg="var(--mantine-primary-color-filled)"
      style={{ zIndex: 1, pointerEvents: "none", transform: "translateY(-50%)" }}
    >
      {(["left", "right"] as const).map(side =>
        <Box
          key={side}
          pos="absolute"
          {...{ [side]: -DOT_SIZE / 2 }}
          top={1 - DOT_SIZE / 2}
          w={DOT_SIZE}
          h={DOT_SIZE}
          bg="var(--mantine-primary-color-filled)"
          style={{ borderRadius: "50%" }}
        />
      )}
    </Box>
  );
}
