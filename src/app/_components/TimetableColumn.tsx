import { Box, Card, Group, Popover, PopoverDropdown, PopoverTarget, Stack, Text } from "@mantine/core";
import type { CombinedScreening } from "./types";

type TimetableColumnProps = {
  day: string;
  timeLabels: string[];
  hourHeight: number;
  startHour: number;
  endHour: number;
  screenings: CombinedScreening[];
};

export function TimetableColumn({ day, timeLabels, screenings, hourHeight, startHour, endHour }: TimetableColumnProps) {
  return (
    <Box key={"column-entries" + day} pos="relative" h={hourHeight * (endHour - startHour)}>
      {timeLabels.map((time, j) => (
        <Box
          key={"segment" + day + time}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: hourHeight,
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            top: hourHeight * j,
          }}
        />
      ))}

      {/* Screenings */}
      {screenings.map((screening) => {
        const hours = screening.startTime.getHours();
        const minutes = screening.startTime.getMinutes();
        const top = (hours - startHour + minutes / 60) * hourHeight;

        // Calculate width and position based on column information
        const width = `calc((100% - 8px) / ${screening.totalColumns})`;
        const left = `calc(4px + ${screening.columnIndex} * (100% - 8px) / ${screening.totalColumns})`;

        return (
          <Popover key={"popover" + screening.id}>
            <PopoverTarget key={"popover-target" + screening.id}>
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
  );
}
