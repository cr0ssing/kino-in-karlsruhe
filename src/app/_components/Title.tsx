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
import localFont from "next/font/local";
import Link from "next/link";

const font = localFont({ src: "./AcademyFilled3D.woff2", weight: "400", style: "normal" });

export default function Title() {
  const isNarrow = useMediaQuery(`(max-width: ${em(1150)})`);
  const isMobile = useMediaQuery(`(max-width: ${em(900)})`);

  return (
    <Link href="/" scroll={false}>
      <Group
        align="center"
        wrap="nowrap"
        gap="xs"
        top={16}
        left={12}
        pos="absolute"
      >
        <Image src="/icon.png" alt="Kino in Karlsruhe" h={36} w={36} style={{ transform: isMobile ? "translateY(-8.5px)" : "translateY(-7px)" }} />
        <Text
          hidden={isNarrow}
          fz={25}
          fw={400}
          ff={font.style.fontFamily}
          variant="gradient"
          gradient={{ from: "var(--mantine-primary-color-filled)", to: "var(--mantine-primary-color-filled-hover)" }}
        >
          Kino in Karlsruhe
        </Text>
      </Group>
    </Link>
  );
}
