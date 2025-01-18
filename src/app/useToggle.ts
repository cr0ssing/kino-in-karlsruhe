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

import { useState } from "react";

export function useToggle<T>(all: T[]) {
  const [filtered, setFiltered] = useState<T[]>(all);

  return [function (item: T) {
    const allEnabled = filtered.length === all.length;

    if (allEnabled) {
      // If all items are enabled, only keep the clicked item
      setFiltered([item]);
    } else if (filtered.length === 1 && filtered.includes(item)) {
      // If only one item is enabled and it's being toggled, enable all items
      setFiltered(all);
    } else {
      // Otherwise, behave as before
      setFiltered(filtered.includes(item)
        ? filtered.filter(m => m !== item)
        : [...filtered, item]);
    }
  }, filtered, setFiltered] as const;
}
