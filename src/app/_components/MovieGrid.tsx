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

import { SimpleGrid } from "@mantine/core";
import type { Movie } from "@prisma/client";
import MoviePoster from "./MoviePoster";
import { useViewportSize } from "@mantine/hooks";

interface MovieGridProps {
  movies: Movie[];
  filteredMovies: number[];
  toggleMovie: (movieId: number) => void;
  openMovieModal: (movieId: number) => void;
}

export default function MovieGrid({ movies, filteredMovies, toggleMovie, openMovieModal }: MovieGridProps) {
  const { width } = useViewportSize();
  
  // Use the same widths as in MovieCarousel
  const posterWidth = width >= 1400 ? 150
    : width >= 1200 ? 140
    : width >= 992 ? 130
    : width >= 768 ? 120
    : width >= 576 ? 110
    : width >= 400 ? (width - 7 * 8) / 5
    : (width - 7 * 8) / 4;

  // Calculate how many posters can fit in a row
  const cols = Math.floor(width / (posterWidth + 8)); // 8 is the gap between posters

  return (
    <SimpleGrid
      cols={cols}
      spacing="sm"
      verticalSpacing="sm"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${posterWidth}px)`,
        justifyContent: 'center'
      }}
    >
      {movies.map(movie => ({ ...movie, enabled: filteredMovies.includes(movie.id) })).map((movie) => (
        <MoviePoster
          key={movie.id}
          movie={movie}
          filteredMoviesCount={filteredMovies.length}
          moviesCount={movies.length}
          toggleMovie={toggleMovie}
          openMovieModal={openMovieModal}
        />
      ))}
    </SimpleGrid>
  );
} 