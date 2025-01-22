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

import { createTheme, DEFAULT_THEME, MantineProvider, mergeMantineTheme } from "@mantine/core";
import { GeistSans } from "geist/font/sans";
import { breakpoints, colors, timetableBorderColors, timetableTodayColors } from "./theme";

const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    fontFamily: GeistSans.style.fontFamily,
    breakpoints,
    primaryColor: "red",
    colors,
  })
);

const cssVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-timetable-border": timetableBorderColors.light,
    "--mantine-color-timetable-today": timetableTodayColors.light
  },
  dark: {
    "--mantine-color-timetable-border": timetableBorderColors.dark,
    "--mantine-color-timetable-today": timetableTodayColors.dark
  },
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <MantineProvider defaultColorScheme="auto" theme={theme} cssVariablesResolver={cssVariablesResolver}>
    {children}
  </MantineProvider>;
}