import { ActionIcon, Box, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Dispatch, SetStateAction } from "react";

type TimetableHeaderProps = {
  text: string;
  index: number;
  selectedDay: number;
  setSelectedDay: Dispatch<SetStateAction<number>>;
};

export default function TimetableHeader({ text, index, selectedDay, setSelectedDay }: TimetableHeaderProps) {
  return (
    <Group
      justify="center"
      p="sm"
      top="0"
      pos="sticky"
      bg="var(--mantine-color-body)"
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        zIndex: 3,
      }}>
      {index !== -1 && selectedDay !== -1 && (
        <ActionIcon
          variant="subtle"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDay((prev: number) => (prev - 1 + 7) % 7);
          }}
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
      )}

      <Box
        style={{ cursor: index === -1 ? undefined : 'pointer' }}
        onClick={() => setSelectedDay(selectedDay === index ? -1 : index)}>
        <Text size="lg" fw={700} ta="center">{text}</Text>
      </Box>

      {index !== -1 && selectedDay !== -1 && (
        <ActionIcon
          variant="subtle"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDay((prev: number) => (prev + 1) % 7);
          }}
        >
          <IconChevronRight size={16} />
        </ActionIcon>
      )}
    </Group>
  )
}
