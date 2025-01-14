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
