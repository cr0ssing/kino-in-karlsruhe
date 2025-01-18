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

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconFilterDown, IconFilterUp } from "@tabler/icons-react";

export default function FilterButton({ showFilters, toggleFilters }: { showFilters: boolean, toggleFilters: () => void }) {
  return (
    <Tooltip position="bottom" label={showFilters ? "Filter ausblenden" : "Filter anzeigen"}>
      <ActionIcon variant="light" size="md" radius="xl" onClick={toggleFilters}>
        {showFilters ? <IconFilterUp size={15} /> : <IconFilterDown size={15} />}
      </ActionIcon>
    </Tooltip>
  );
}
