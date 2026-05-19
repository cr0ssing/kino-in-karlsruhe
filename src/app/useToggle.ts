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

import { useCallback, useRef, useState } from "react";

type CreateStateHook<T> = (init: T[]) => [T[], (args: T[] | ((old: T[]) => T[])) => object | void];

export function useToggle<T>(all: T[], useStateHook: CreateStateHook<T> = (init) => useState(init)) {
  const allRef = useRef(all);
  const [filtered, setFiltered] = useStateHook(all);

  const toggle = useCallback(function (item: T) {
    const currentAll = allRef.current;
    const allEnabled = filtered.length === currentAll.length;

    if (allEnabled) {
      // If all items are enabled, only keep the clicked item
      setFiltered([item]);
    } else if (filtered.length === 1 && filtered.includes(item)) {
      // If only one item is enabled and it's being toggled, enable all items
      setFiltered(currentAll);
    } else {
      // Otherwise, behave as before
      setFiltered(filtered.includes(item)
        ? filtered.filter(m => m !== item)
        : [...filtered, item]);
    }
  }, [filtered, setFiltered]);

  const setAll = useCallback(function (newAll: T[]) {
    allRef.current = newAll;
  }, []);

  return [toggle, filtered, setFiltered, setAll] as const;
}
