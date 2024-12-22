import { Paper, Box, Stack, Text, Card, Group, Tooltip, Popover, PopoverTarget, PopoverDropdown } from '@mantine/core';
import type { Screening, Movie, Cinema } from '@prisma/client';

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: Movie, cinema: Cinema }>;
}

const START_HOUR = 9;
const END_HOUR = 24;
const HOUR_HEIGHT = 250;

export function ScreeningTimetable({ screenings }: ScreeningTimetableProps) {
  type CombinedScreening = Screening & {
    movie: { title: string, length: number | null },
    cinemas: { name: string, color: string }[],
    columnIndex: number,
    totalColumns: number,
  };

  const combined = new Map<string, CombinedScreening>();

  screenings.forEach((screening) => {
    const key = `${screening.movieId}-${screening.startTime.getTime()}`;
    if (!combined.has(key)) {
      combined.set(key, {
        ...screening,
        cinemas: [{ name: screening.cinema.name, color: screening.cinema.color }],
        columnIndex: 0,
        totalColumns: 1,
      });
    } else {
      const existing = combined.get(key)!;
      existing.cinemas.push({ name: screening.cinema.name, color: screening.cinema.color });
    }

    return Array.from(combined.values());
  });

  const combinedScreenings = Array.from(combined.values());

  // Add function to group screenings by time slots and assign column positions
  function assignScreeningColumns(screenings: typeof combinedScreenings) {
    // Group screenings that start within 15 minutes of each other
    const timeSlots = new Map<number, typeof combinedScreenings>();

    screenings.forEach(screening => {
      const timeKey = Math.floor(
        (screening.startTime.getHours() * 60 + screening.startTime.getMinutes()) / 15
      );

      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, []);
      }
      timeSlots.get(timeKey)!.push(screening);
    });

    // Assign column index to each screening
    return screenings.map(screening => {
      const timeKey = Math.floor(
        (screening.startTime.getHours() * 60 + screening.startTime.getMinutes()) / 15
      );
      const sameTimeScreenings = timeSlots.get(timeKey)!;
      const columnIndex = sameTimeScreenings.indexOf(screening);
      const totalColumns = sameTimeScreenings.length;

      return {
        ...screening,
        columnIndex,
        totalColumns,
      };
    });
  }

  // Modify the grouping logic to use combined screenings with column information
  const groupedByWeekday = combinedScreenings.reduce((acc, screening) => {
    const weekday = screening.startTime.getDay();
    const mondayBasedDay = weekday === 0 ? 6 : weekday - 1;
    if (!acc[mondayBasedDay]) {
      acc[mondayBasedDay] = [];
    }
    acc[mondayBasedDay].push(screening);
    return acc;
  }, {} as Record<number, typeof combinedScreenings>);

  // Assign columns for each day's screenings
  Object.keys(groupedByWeekday).forEach(day => {
    groupedByWeekday[Number(day)] = assignScreeningColumns(groupedByWeekday[Number(day)]!);
  });

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
      {weekdays.map((day, index, arr) => (
        <Box
          key={day}
          style={{
            gridColumn: index + 2,
            borderRight: index < arr.length - 1 ? '1px solid var(--mantine-color-gray-3)' : undefined,
            position: 'relative',
          }}
        >
          {/* Day header */}
          <Header text={day} />
          {/* Time grid */}
          <Box pos="relative" h={HOUR_HEIGHT * (END_HOUR - START_HOUR)}>
            {timeLabels.map((time, i) => (
              <Box
                key={day + time}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: HOUR_HEIGHT,
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                  top: HOUR_HEIGHT * i,
                }}
              />
            ))}

            {/* Screenings */}
            {groupedByWeekday[index]?.map((screening) => {
              const hours = screening.startTime.getHours();
              const minutes = screening.startTime.getMinutes();
              const top = (hours - START_HOUR + minutes / 60) * HOUR_HEIGHT;

              // Calculate width and position based on column information
              const width = `calc((100% - 8px) / ${screening.totalColumns})`;
              const left = `calc(4px + ${screening.columnIndex} * (100% - 8px) / ${screening.totalColumns})`;

              return (
                <Popover>
                  <PopoverTarget>
                    <Card
                      key={screening.id}
                      shadow="xs"
                      padding="xs"
                      radius="sm"
                      pos="absolute"
                      bg={screening.cinemas.length === 1 ? `${screening.cinemas[0]!.color}11` : undefined}
                      top={`${top}px`}
                      left={left}
                      w={width}
                      style={{
                        zIndex: 2,
                        cursor: 'pointer',
                      }}
                    >
                      <Stack gap={2}>
                        <Text size="sm" fw={700} lineClamp={1}>
                          {screening.movie.title}
                        </Text>
                        <Group>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {screening.cinemas.map(c => c.name).join(', ')}
                          </Text>
                        </Group>
                      </Stack>
                    </Card>
                  </PopoverTarget>
                  <PopoverDropdown>
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">{screening.startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} • {screening.movie.length} mins</Text>
                      <Text fw={700}>{screening.movie.title}</Text>
                      <Text size="sm">{screening.cinemas.map(c => c.name).join(', ')}</Text>
                      <Text size="xs" c="dimmed">{screening.properties.join(', ')}</Text>
                    </Stack>
                  </PopoverDropdown>
                </Popover>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
