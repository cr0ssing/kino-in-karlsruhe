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
  const toShow = 6;
  function fallbackURL(title: string) {
    return `https://placehold.co/400x600?text=${encodeURIComponent(title)}`;
  }

  return (
    <Carousel
      height={450}
      align="center"
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
