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

import { Carousel, CarouselSlide } from '@mantine/carousel';
import { ActionIcon, Card, CardSection, Group, Image, Text, Tooltip } from '@mantine/core';
import type { Movie } from '@prisma/client';
import { IconEye, IconEyeOff } from "@tabler/icons-react";

interface MovieCarouselProps {
  movies: Movie[];
  filteredMovies: number[];
  toggleMovie: (movieId: number) => void;
}

export default function MovieCarousel({ movies, filteredMovies, toggleMovie }: MovieCarouselProps) {
  // TODO adjust this to breakpoints
  const toShow = 6;
  function fallbackURL(title: string) {
    return `https://placehold.co/400x600?text=${encodeURIComponent(title)}`;
  }

  return (
    <Carousel
      height={450}
      align="start"
      slidesToScroll={1}
      slideSize={{ xl: `${100 / 7}%`, lg: `${100 / 6}%`, md: `${100 / 5}%`, sm: `${100 / 4}%`, xs: `${100 / 2}%` }}
      slideGap="sm"
      loop
      dragFree={movies.length > toShow}
      draggable={movies.length > toShow}
      withIndicators={false}
      withControls={movies.length > toShow}
    >
      {movies.map(movie => ({ ...movie, enabled: filteredMovies.includes(movie.id) })).map((movie) => (
        <CarouselSlide key={movie.id}>
          <Card shadow="md">
            <CardSection pos="relative">
              <Image
                src={movie.posterUrl ? `https://image.tmdb.org/t/p/w500${movie.posterUrl}` : fallbackURL(movie.title)}
                fit="contain"
                alt={movie.title}
                fallbackSrc={fallbackURL("Kein Poster")}
                h={375}
              />
              {!movie.enabled && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  }}
                />
              )}
            </CardSection>
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                variant="transparent"
                size="xs"
                onClick={() => toggleMovie(movie.id)}
              >
                {movie.enabled ? <IconEye size={15} /> : <IconEyeOff size={15} />}
              </ActionIcon>
              <Tooltip label={movie.title}>
                <Text c={movie.enabled ? "inherit" : "dimmed"} fw={500} lineClamp={1}>{movie.title}</Text>
              </Tooltip>
            </Group>
          </Card>
        </CarouselSlide>
      ))}
    </Carousel>
  );
} 
