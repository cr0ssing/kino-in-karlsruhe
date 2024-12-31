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
import { ActionIcon, Card, CardSection, Group, Image, Overlay, Text, Tooltip } from '@mantine/core';
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
  const imageHeights = { xl: 230, lg: 220, md: 220, sm: 200, xs: 130, base: 130 }
  const imageWidths = Object.fromEntries(Object.entries(imageHeights).map(([key, value]) => [key, value * 1 / 1.7]))
  return (
    <Carousel
      align="start"
      slidesToScroll={1}
      slideSize={{ xl: `${100 / 10}%`, lg: `${100 / 8}%`, md: `${100 / 6}%`, sm: `${100 / 4}%`, xs: `${100 / 3}%`, base: `${100 / 3}%` }}
      slideGap="sm"
      loop
      dragFree={movies.length > toShow}
      draggable={movies.length > toShow}
      withIndicators={false}
      withControls={movies.length > toShow}
    >
      {movies.map(movie => ({ ...movie, enabled: filteredMovies.includes(movie.id) })).map((movie) => (
        <CarouselSlide key={movie.id} w={imageWidths} h={Object.fromEntries(Object.entries(imageHeights).map(([key, value]) => [key, value + 90]))}>
          <Card shadow="md">
            <CardSection mb="sm">
              <Image
                src={movie.posterUrl ? `https://image.tmdb.org/t/p/w500${movie.posterUrl}` : fallbackURL(movie.title)}
                fit="contain"
                alt={movie.title}
                fallbackSrc={fallbackURL("Kein Poster")}
                h={imageHeights}
              />
            </CardSection>
            {!movie.enabled && <Overlay color="rgb(255,255,255)" backgroundOpacity={0.7} />}
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
