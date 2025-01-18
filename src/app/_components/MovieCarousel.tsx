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

import { Carousel, CarouselSlide, type Embla } from '@mantine/carousel';
import { ActionIcon, Card, CardSection, Image, Overlay, Tooltip, alpha } from '@mantine/core';
import type { Movie } from '@prisma/client';
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";

interface MovieCarouselProps {
  movies: Movie[];
  filteredMovies: number[];
  toggleMovie: (movieId: number) => void;
  searchIndex: number;
}

export default function MovieCarousel({ searchIndex, movies, filteredMovies, toggleMovie }: MovieCarouselProps) {
  // TODO adjust this to breakpoints
  const toShow = 6;
  function fallbackURL(title: string) {
    return `https://placehold.co/400x600?text=${encodeURIComponent(title)}`;
  }

  const [emblaApi, setEmblaApi] = useState<Embla | null>(null);

  useEffect(() => {
    if (!emblaApi || searchIndex === -1) return;
    emblaApi.scrollTo(searchIndex);
  }, [searchIndex, emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0);
    }
  }, [movies, emblaApi]);

  return (
    <Carousel
      align="start"
      slidesToScroll={1}
      slideSize={{ xl: "150px", lg: "140px", md: "130px", sm: "120px", xs: "110px", base: `${100 / 3}%` }}
      slideGap="sm"
      loop
      styles={{ control: { backgroundColor: alpha("var(--mantine-primary-color-filled)", 0.7), color: "white", border: "0px" } }}
      dragFree={movies.length > toShow}
      draggable={movies.length > toShow}
      withIndicators={false}
      withControls={movies.length > toShow}
      getEmblaApi={setEmblaApi}
    >
      {movies.map(movie => ({ ...movie, enabled: filteredMovies.includes(movie.id) })).map((movie) => (
        <CarouselSlide
          key={movie.id}
        >
          <Tooltip label={movie.title}>
            <Card withBorder>
              <CardSection>
                <Image
                  src={movie.posterUrl ? `https://image.tmdb.org/t/p/w440_and_h660_face${movie.posterUrl}` : fallbackURL(movie.title)}
                  fit="contain"
                  alt={movie.title}
                  fallbackSrc={fallbackURL("Kein Poster")}
                />
                {!movie.enabled && <Overlay color="rgb(255,255,255)" backgroundOpacity={0.7} />}
                <Tooltip
                  label={
                    filteredMovies.length === movies.length
                      ? "Nur diesen Film einblenden"
                      : movie.enabled
                        ? filteredMovies.length === 1
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
                    onClick={() => toggleMovie(movie.id)}
                    style={{ zIndex: 200 }}
                  >
                    {movie.enabled && <IconCheck size={13} />}
                  </ActionIcon>
                </Tooltip>
              </CardSection>
            </Card>
          </Tooltip>
        </CarouselSlide>
      ))}
    </Carousel>
  );
}
