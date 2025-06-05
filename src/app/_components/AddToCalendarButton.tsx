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

import { ActionIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendarPlus } from "@tabler/icons-react";
import AddToCalendarModal from "./AddToCalendarModal";
import type { Screening } from "@prisma/client";

export default function AddToCalendarButton({
  screening,
  cinema,
  properties
}: {
  screening: Screening & { movie: { title: string; length: number | null; releaseDate: Date | null; } };
  cinema: { name: string; address: string };
  properties: string[];
}) {
  const [isOpen, { open, close }] = useDisclosure(false);

  return (
    <>
      <Tooltip label="Zum Kalender hinzufügen">
        <ActionIcon variant="transparent" size="xs" onClick={open}>
          <IconCalendarPlus />
        </ActionIcon>
      </Tooltip>
      <AddToCalendarModal isOpen={isOpen} close={close} screening={screening} cinema={cinema} properties={properties} />
    </>
  );
}
