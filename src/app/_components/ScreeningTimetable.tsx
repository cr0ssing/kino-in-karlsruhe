import { Paper, Box, Stack, Text, Card } from '@mantine/core';
import type { Screening } from '@prisma/client';

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: { title: string }, cinema: { name: string } }>;
}

const START_HOUR = 9;
const END_HOUR = 24;
const HOUR_HEIGHT = 120;

export function ScreeningTimetable({ screenings }: ScreeningTimetableProps) {
  type CombinedScreening = Screening & {
    movie: { title: string },
    cinemas: { name: string }[]
  };

  const combined = new Map<string, CombinedScreening>();

  screenings.forEach((screening) => {
    const key = `${screening.movieId}-${screening.startTime.getTime()}`;
    if (!combined.has(key)) {
      combined.set(key, {
        ...screening,
        cinemas: [{ name: screening.cinema.name }]
      });
    } else {
      const existing = combined.get(key)!;
      existing.cinemas.push({ name: screening.cinema.name });
    }

    return Array.from(combined.values());
  });

  const combinedScreenings = Array.from(combined.values());

  // Modify the grouping logic to use combined screenings
  const groupedByWeekday = combinedScreenings.reduce((acc, screening) => {
    const weekday = screening.startTime.getDay();
    const mondayBasedDay = weekday === 0 ? 6 : weekday - 1;
    if (!acc[mondayBasedDay]) {
      acc[mondayBasedDay] = [];
    }
    acc[mondayBasedDay].push(screening);
    return acc;
  }, {} as Record<number, typeof combinedScreenings>);

  // Weekday headers (now starting with Monday)
  const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  const timeLabels = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => `${(START_HOUR + i).toString().padStart(2, '0')}:00`
  );

  function Header({ text }: { text: string }) {
    return (
      <Box
        p="sm"
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          position: 'sticky',
          top: 0,
          background: 'var(--mantine-color-body)',
          zIndex: 1
        }}
      >
        <Text fw={700} ta="center">{text}</Text>
      </Box>
    )
  }

  return (
    <Paper shadow="xs" p="md">
      <Box style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative' }}>
        {/* Time labels column */}
        <Stack gap={0} style={{ gridColumn: '1', borderRight: '1px solid var(--mantine-color-gray-3)' }}>
          <Header text="Zeit" />
          {timeLabels.map((time) => (
            <Box
              key={time}
              h={HOUR_HEIGHT}
              style={{
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                padding: '4px',
              }}
            >
              <Text size="xs" ta="center">{time}</Text>
            </Box>
          ))}
        </Stack>

        {/* Days columns */}
        {weekdays.map((day, index) => (
          <Box
            key={day}
            style={{
              gridColumn: index + 2,
              borderRight: '1px solid var(--mantine-color-gray-3)',
              position: 'relative',
            }}
          >
            {/* Day header */}
            <Header text={day} />
            {/* Time grid */}
            <Box pos="relative" h={HOUR_HEIGHT * (END_HOUR - START_HOUR)}>
              {timeLabels.map((time) => (
                <Box
                  key={time}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: HOUR_HEIGHT,
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                    top: HOUR_HEIGHT * timeLabels.indexOf(time),
                  }}
                />
              ))}

              {/* Screenings */}
              {groupedByWeekday[index]?.map((screening) => {
                const hours = screening.startTime.getHours();
                const minutes = screening.startTime.getMinutes();
                const top = (hours - START_HOUR + minutes / 60) * HOUR_HEIGHT;

                return (
                  <Card
                    key={screening.id}
                    shadow="xs"
                    padding="xs"
                    radius="sm"
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      left: '4px',
                      right: '4px',
                      zIndex: 2,
                    }}
                  >
                    <Stack gap={2}>
                      <Text size="sm" fw={700} lineClamp={1}>
                        {screening.movie.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {screening.cinemas.map(c => c.name).join(', ')}
                      </Text>
                      <Text size="xs">
                        {screening.startTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Stack>
                  </Card>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
