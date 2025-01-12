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

"use client";

import { Group, Text, Image, em } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks";

export default function Title() {
  const isNarrow = useMediaQuery(`(max-width: ${em(1100)})`);
  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);

  return (
    <Group align="center" wrap="nowrap" gap="xs" top={0} left={0} ml="xl" mt="xl" pos="absolute">
      <Image src="/icon.png" alt="Kino in Karlsruhe" h={36} w={36} style={{ transform: isMobile ? "translateY(-8.5px)" : "translateY(-5px)" }} />
      <Text
        hidden={isNarrow}
        fz={23}
        fw={700}
        variant="gradient"
        gradient={{ from: "var(--mantine-primary-color-filled)", to: "var(--mantine-primary-color-filled-hover)" }}
      >
        Kino in Karlsruhe
      </Text>
    </Group>
  );
}
