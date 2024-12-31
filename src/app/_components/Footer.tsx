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

import { Anchor, Group, Text } from "@mantine/core";
import Link from "next/link";

export default function Footer() {
  return (
    <Group gap={0} justify="center" p="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-4)' }}>
      <Text size="sm">Made with ❤️ in Karlsruhe
        • <Anchor component={Link} href="/impressum">Impressum</Anchor>
        &nbsp;• <Anchor component={Link} href="https://github.com/cr0ssing/kino-in-karlsruhe">Quellcode</Anchor>
      </Text>
    </Group>
  );
}
