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

import { CloseButton, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import type { Movie } from "@prisma/client";
import { IconExclamationMark, IconSearch } from "@tabler/icons-react";
import { useState } from "react";

export default function MovieSearchInput({ movies, scrollToIndex }: { movies: Movie[], scrollToIndex: (index: number) => void }) {
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState(false);
  const debouncedSearch = useDebouncedCallback(async (search: string) => {
    if (!search) {
      setNotFound(false);
      return;
    }
    const movieIndex = movies.findIndex(m => m.title.toLowerCase().includes(search.toLowerCase()));
    if (movieIndex === -1) {
      setNotFound(true);
    } else {
      setNotFound(false);
      scrollToIndex(movieIndex);
    }
  }, 200);

  return (
    <TextInput
      placeholder="Film suchen"
      size="xs"
      value={search}
      onChange={e => {
        setSearch(e.currentTarget.value);
        debouncedSearch(e.currentTarget.value);
      }}
      leftSection={notFound ?
        <Tooltip label="Film nicht gefunden">
          <IconExclamationMark size={16} color="red" />
        </Tooltip> :
        <IconSearch size={16} />}
      rightSection={search &&
        <Tooltip label="Eingabe löschen">
          <CloseButton size={16} variant="transparent" onClick={() => { setSearch(""); setNotFound(false); }} />
        </Tooltip>}
    />
  );
}
