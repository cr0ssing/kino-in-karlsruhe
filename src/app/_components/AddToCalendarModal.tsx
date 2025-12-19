/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

import { AspectRatio, Button, Card, CloseButton, Divider, Group, Modal, Stack, Table, TableTbody, TableTd, TableTr, Text } from "@mantine/core";
import {
  IconBrandGoogle,
  IconCalendarDown,
  IconMapPin,
  IconCalendarEvent,
  IconAdjustments
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { type CalendarEvent, google, ics } from "calendar-link";
import type { Screening } from "~/../prisma/generated/prisma/client";

type AddToCalendarModalProps = {
  isOpen: boolean,
  close: () => void,
  screening: Screening & { movie: { title: string; length: number | null; releaseDate: Date | null; } },
  cinema: { name: string, address: string },
  properties: string[]
}

const iconSize = 15;

export default function AddToCalendarModal({ isOpen, close, screening, cinema, properties }: AddToCalendarModalProps) {
  const length = (screening.movie.length ?? 120) + 15;

  const event: CalendarEvent = {
    title: screening.movie.title,
    description: (screening.movie.length ? "Laufzeit: " + screening.movie.length + " mins\n" : "")
      + (properties.length > 0 ? "Eigenschaften: " + properties.join(', ') : ""),
    start: screening.startTime.toISOString(),
    location: cinema.name + ", " + cinema.address,
    duration: [length, "minute"],
  };

  const googleCalendarLink = google(event);
  const icsCalendarLink = ics(event);

  return <Modal
    opened={isOpen}
    onClose={close}
    centered
    size="auto"
    withCloseButton={false}
    overlayProps={{ blur: 13, backgroundOpacity: 0.55 }}
    zIndex={1000}
  >
    <Stack gap="xs">
      <Group wrap="nowrap" align="start" justify="space-between">
        <Text size="lg" fw={700}>{screening.movie.title}</Text>
        <CloseButton mt="1.5px" aria-label="Schließen" c="bright" onClick={close} />
      </Group>
      <Group wrap="nowrap">
        <AspectRatio ratio={1}>
          <Card pt="0px" pb="0px" bg="var(--mantine-color-timetable-today)" withBorder>
            <Group justify="center" align="center" h="100%">
              <Stack gap={0}>
                <Text size={properties.length > 0 ? "lg" : "md"} ta="center" fw={700}>
                  {dayjs(screening.startTime).locale('de').format('D')}
                </Text>
                <Text size={properties.length > 0 ? "md" : "sm"} ta="center">
                  {dayjs(screening.startTime).locale('de').format('MMM')}
                </Text>
              </Stack>
            </Group>
          </Card>
        </AspectRatio>
        <Table withRowBorders={false} horizontalSpacing="4px" verticalSpacing={properties.length > 0 ? "3px" : "5px"}>
          <TableTbody>
            <TableTr>
              <TableTd>
                <IconCalendarEvent size={iconSize} />
              </TableTd>
              <TableTd>
                <Text size="xs" >
                  {dayjs(screening.startTime).format('HH:mm')} - {dayjs(screening.startTime).add(length, 'minute').format('HH:mm')}
                  {screening.movie.length && ` (Laufzeit: ${screening.movie.length} mins)`}
                </Text>
              </TableTd>
            </TableTr>
            <TableTr>
              <TableTd>
                <IconMapPin size={iconSize} />
              </TableTd>
              <TableTd>
                {/* TODO add link to google maps */}
                <Text lineClamp={1} size="xs" >{cinema.name}, {cinema.address}</Text>
              </TableTd>
            </TableTr>
            {properties.length > 0 && <TableTr>
              <TableTd>
                <IconAdjustments size={iconSize} />
              </TableTd>
              <TableTd>
                <Text lineClamp={1} size="xs" >{properties.join(', ')}</Text>
              </TableTd>
            </TableTr>}
          </TableTbody>
        </Table>
      </Group>
      <Divider />
      <Button component="a" href={googleCalendarLink} target="_blank" leftSection={<IconBrandGoogle stroke={1} />}>
        Google Calendar
      </Button>
      <Button component="a" href={icsCalendarLink} leftSection={<IconCalendarDown stroke={1} />}>
        ICS Datei
      </Button>
    </Stack>
  </Modal>
}
