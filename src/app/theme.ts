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

import {
  DEFAULT_THEME,
  type MantineThemeColors,
  type MantineBreakpointsValues,
  lighten,
} from "@mantine/core";

export const colors: MantineThemeColors = DEFAULT_THEME.colors;
export const breakpoints: MantineBreakpointsValues = DEFAULT_THEME.breakpoints;

export const timetableBorderColors = {
  light: lighten("var(--mantine-color-default-border)", .4),
  dark: lighten("var(--mantine-color-default-border)", .2)
};
export const timetableTodayColors = {
  light: "var(--mantine-color-gray-1)",
  dark: "var(--mantine-color-dark-4)"
};
