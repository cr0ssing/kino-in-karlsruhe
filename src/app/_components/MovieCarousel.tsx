import { Carousel, CarouselSlide } from '@mantine/carousel';
import { Card, CardSection, Image, Text, Tooltip } from '@mantine/core';
import type { Movie } from '@prisma/client';
import { env } from "process";

interface MovieCarouselProps {
  movies: Movie[];
}

export async function MovieCarousel({ movies }: MovieCarouselProps) {
  const posterUrls = new Map((await Promise.all(movies.map(async (movie) => {
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${movie.title}&include_adult=true&language=de-DE`, {
      headers: {
        Authorization: `Bearer ${env.TMDB_API_KEY}`,
      },
    });
    const data = await response.json() as { results: { poster_path: string }[] };
    const result = data.results[0];
    return [movie.id, result?.poster_path] as const
  }))).filter(([_, poster_path]) => poster_path !== null)
  )

  const toShow = 5;

  return (
    <Carousel
      height={430}
      align="center"
      slidesToScroll={1}
      slideSize={`${100 / toShow}%`}
      slideGap="sm"
      loop
      dragFree={movies.length > toShow}
      draggable={movies.length > toShow}
      withIndicators={false}
      withControls={movies.length > toShow}
    >
      {movies.map((movie) => (
        <CarouselSlide key={movie.id}>
          <Card shadow="sm">
            <CardSection>
              <Image
                src={`https://image.tmdb.org/t/p/w500/${posterUrls.get(movie.id) ?? 'wrong'}`} // You'll need to handle movie posters
                alt={movie.title}
                fallbackSrc="https://placehold.co/400x600?text=No+Poster"
                h={375}
              />
            </CardSection>
            <Tooltip label={movie.title}>
              <Text fw={500} mt="sm" lineClamp={1}>{movie.title}</Text>
            </Tooltip>
          </Card>
        </CarouselSlide>
      ))}
    </Carousel>
  );
} 