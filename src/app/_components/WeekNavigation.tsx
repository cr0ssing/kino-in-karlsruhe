import { Button, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export default function WeekNavigation({ weekOffset, dateRange }: { weekOffset: number, dateRange: string }) {
  return (
    <Group justify="center">
      <Button
        component="a"
        href={`/?weekOffset=${weekOffset - 1}`}
        variant="subtle"
        leftSection={<IconChevronLeft size={16} />}
      >
        Vorherige Woche
      </Button>

      <Text fw={500}>{dateRange}</Text>

      <Button
        component="a"
        href={`/?weekOffset=${weekOffset + 1}`}
        variant="subtle"
        rightSection={<IconChevronRight size={16} />}
      >
        Nächste Woche
      </Button>
    </Group>
  );
}