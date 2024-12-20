import { Carousel, CarouselSlide } from '@mantine/carousel';
import { Card, CardSection, Image, Text } from '@mantine/core';
import type { Movie } from '@prisma/client';
import { env } from "process";

interface MovieCarouselProps {
  movies: Movie[];
}

export async function MovieCarousel({ movies }: MovieCarouselProps) {
  const posterUrls = new Map(await Promise.all(movies.map(async (movie) => {
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${movie.title}&include_adult=true&language=de-DE`, {
      headers: {
        Authorization: `Bearer ${env.TMDB_API_KEY}`,
      },
    });
    const data = await response.json() as { results: { poster_path: string }[] };
    const result = data.results[0];
    return [movie.id, result?.poster_path] as const
  }))
  )

  const toShow = 5;

  return (
    <Carousel
      height={450}
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
        <CarouselSlide key={movie.id}>
          <Card shadow="sm">
            <CardSection>
              <Image
                src={`https://image.tmdb.org/t/p/w500/${posterUrls.get(movie.id)}`} // You'll need to handle movie posters
                alt={movie.title}
                fallbackSrc="https://placehold.co/250×375?text=No+Poster"
              />
            </CardSection>
            <Text fw={500} mt="sm">{movie.title}</Text>
          </Card>
        </CarouselSlide>
      ))}
    </Carousel>
  );
} 