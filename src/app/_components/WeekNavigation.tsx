"use client";

import { Button, em, Group, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export default function WeekNavigation({ weekOffset, dateRange }: { weekOffset: number, dateRange: string }) {
  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);

  return (
    <Group justify="center">
      <Button
        component="a"
        href={`/?weekOffset=${weekOffset - 1}`}
        variant="subtle"
        leftSection={<IconChevronLeft size={16} />}
      >
        {isMobile ? '' : 'Vorherige Woche'}
      </Button>

      <Text fw={500}>{dateRange}</Text>

      <Button
        component="a"
        href={`/?weekOffset=${weekOffset + 1}`}
        variant="subtle"
        rightSection={<IconChevronRight size={16} />}
      >
        {isMobile ? '' : 'Nächste Woche'}
      </Button>
    </Group>
  );
}