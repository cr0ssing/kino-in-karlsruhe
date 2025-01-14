import { CloseButton, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import type { Movie } from "@prisma/client";
import { IconExclamationMark } from "@tabler/icons-react";
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
      leftSection={notFound &&
        <Tooltip label="Film nicht gefunden">
          <IconExclamationMark size={16} color="red" />
        </Tooltip>}
      rightSection={search &&
        <Tooltip label="Eingabe löschen">
          <CloseButton size={16} variant="transparent" onClick={() => { setSearch(""); setNotFound(false); }} />
        </Tooltip>}
    />
  );
}
