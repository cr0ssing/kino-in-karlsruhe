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

import { ActionIcon, alpha, Card, CardSection, Overlay, Tooltip, Image } from "@mantine/core";
import type { Movie } from "~/../prisma/generated/prisma/client";
import { IconCheck } from "@tabler/icons-react";

function fallbackURL(title: string) {
  return `https://placehold.co/400x600?text=${encodeURIComponent(title)}`;
}

type MoviePosterProps = {
  movie: MovieElement;
  filteredMoviesCount: number;
  moviesCount: number;
  toggleMovie: (movieId: number) => void;
  openMovieModal: (movieId: number) => void;
}

type MovieElement = Movie & { enabled: boolean };

export function MoviePosterImage({ posterUrl, title, isLocal }: { posterUrl: string | null, title: string, isLocal: boolean }) {
  return <Image
    src={posterUrl
      ? (!isLocal ? `https://image.tmdb.org/t/p/w440_and_h660_face${posterUrl}` : posterUrl)
      : fallbackURL(title)}
    fit="contain"
    alt={title}
    fallbackSrc={fallbackURL("Kein Poster")}
  />
}

export default function MoviePoster({ movie, filteredMoviesCount, moviesCount, toggleMovie, openMovieModal }: MoviePosterProps) {
  return <Tooltip label={movie.title}>
    <Card
      withBorder
      onClick={() => openMovieModal(movie.id)}
      style={{ cursor: "pointer" }}
    >
      <CardSection>
        <MoviePosterImage posterUrl={movie.posterUrl} title={movie.title} isLocal={movie.tmdbId === null} />
        {!movie.enabled && <Overlay color="rgb(255,255,255)" backgroundOpacity={0.7} zIndex={90} />}
        <Tooltip
          label={
            filteredMoviesCount === moviesCount
              ? "Nur diesen Film einblenden"
              : movie.enabled
                ? filteredMoviesCount === 1
                  ? "Alle einblenden"
                  : "Ausblenden"
                : "Einblenden"}>
          <ActionIcon
            variant="filled"
            radius="xl"
            size="sm"
            pos="absolute"
            bg={alpha("var(--mantine-primary-color-filled)", 0.5)}
            bottom={8}
            right={8}
            onClick={(e) => {
              e.stopPropagation();
              toggleMovie(movie.id);
            }}
            style={{ zIndex: 100 }}
          >
            {movie.enabled && <IconCheck size={13} />}
          </ActionIcon>
        </Tooltip>
      </CardSection>
    </Card>
  </Tooltip>
}
