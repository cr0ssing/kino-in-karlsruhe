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

import { createContext } from "react";

export enum ViewportSize {
  wide = 6,
  normal = 5,
  tight = 4,
  narrow = 3,
  mobile = 2,
  small = 1,
};

export function getViewportSize(viewportWidth: number) {
  return viewportWidth < 1500
    ? viewportWidth < 1150
      ? viewportWidth < 940
        ? viewportWidth < 770
          ? viewportWidth < 500
            ? ViewportSize.small
            : ViewportSize.mobile
          : ViewportSize.narrow
        : ViewportSize.tight
      : ViewportSize.normal
    : ViewportSize.wide;
}

export const ViewportSizeContext = createContext<ViewportSize>(ViewportSize.wide);
