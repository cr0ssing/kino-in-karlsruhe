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

import { ActionIcon, Box, Burger, Menu, MenuDropdown, MenuItem, MenuTarget, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconMoon, IconRefresh, IconSun } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function NavigationMenu() {
  const [burgerMenuOpened, { toggle: toggleBurgerMenu }] = useDisclosure(false);

  const colorScheme = useComputedColorScheme("light");
  const { setColorScheme } = useMantineColorScheme();

  const router = useRouter();

  const iconSize = 15;

  return (
    <Menu onChange={() => toggleBurgerMenu()}>
      <MenuTarget>
        <ActionIcon
          component={Box}
          variant="light"
          size="lg"
          radius="xl"
        >
          <Burger
            opened={burgerMenuOpened}
            size="xs"
            color="var(--mantine-color-red-light-color)"
          />
        </ActionIcon>
      </MenuTarget>
      <MenuDropdown>
        <MenuItem onClick={() => router.refresh()} leftSection={<IconRefresh size={iconSize} />}>
          Aktualisieren
        </MenuItem>
        <MenuItem
          onClick={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}
          leftSection={colorScheme === "dark" ? <IconSun size={iconSize} /> : <IconMoon size={iconSize} />}
        >
          Farbschema wechseln
        </MenuItem>
      </MenuDropdown>
    </Menu>
  );
}
