import { Carousel, CarouselSlide } from '@mantine/carousel';
import { Card, CardSection, Image, Text } from '@mantine/core';
import type { Movie } from '@prisma/client';

interface MovieCarouselProps {
  movies: Movie[];
}

export function MovieCarousel({ movies }: MovieCarouselProps) {

  const toShow = 5;

  return (
    <Carousel
      height={400}
      align="center"
      slidesToScroll={1}
      slideSize={`${100 / toShow}%`}
      slideGap="sm"
      loop
      draggable={movies.length > toShow}
      withIndicators={movies.length > toShow}
      withControls={movies.length > toShow}
    >
      {movies.map((movie) => (
        movie && (
          <CarouselSlide key={movie.id}>
            <Card shadow="sm">
              <CardSection>
                <Image
                  src={`/movie-posters/${movie.id}.jpg`} // You'll need to handle movie posters
                  alt={movie.title}
                  fallbackSrc="https://placehold.co/200x250?text=No+Poster"
                />
              </CardSection>
              <Text fw={500} mt="sm">{movie.title}</Text>
            </Card>
          </CarouselSlide>
        )
      ))}
    </Carousel>
  );
} 