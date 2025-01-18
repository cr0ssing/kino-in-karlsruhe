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

import {
  ActionIcon,
  CheckIcon,
  Combobox,
  ComboboxDropdown,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTarget,
  Group,
  InputBase,
  InputPlaceholder,
  Text,
  useCombobox
} from "@mantine/core";
import type { Cinema } from "@prisma/client";
import { IconChevronDown } from "@tabler/icons-react";

type Options = Cinema & {
  enabled: boolean;
}

interface CinemaComboboxProps {
  cinemas: Options[];
  toggleCinema: (id: number) => void;
  clearFilter: () => void;
}

export default function CinemaCombobox({ cinemas, toggleCinema, clearFilter }: CinemaComboboxProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const options = cinemas.map((item) => (
    <ComboboxOption c={item.color} variant="light" id={item.id.toString()} value={item.name} key={"cinema-cb-option-" + item.id} active={item.enabled}>
      <Group gap="sm">
        {item.enabled ? <CheckIcon size={12} /> : null}
        <span>{item.name}</span>
      </Group>
    </ComboboxOption>
  ));

  return (
    <Combobox store={combobox} onOptionSubmit={(_, props) => toggleCinema(parseInt(props.id!))} withinPortal={false}>
      <ComboboxTarget>
        <InputBase
          component="button"
          type="button"
          pointer
          onClick={() => combobox.toggleDropdown()}
          label="Kinos filtern"
          size="xs"
          rightSectionPointerEvents="none"
          rightSection={
            <ActionIcon size="xs" variant="transparent">
              <IconChevronDown size={12} />
            </ActionIcon>
          }>
          {cinemas.filter(c => c.enabled).length > 0
            ? <Text size="xs">
              {(cinemas.filter(c => c.enabled).length === 1
                ? cinemas.find(c => c.enabled)!.name
                : cinemas.filter(c => c.enabled).length === cinemas.length
                  ? "Alle Kinos"
                  : `${cinemas.filter(c => c.enabled).length} Kinos`) + " ausgewählt"}</Text>
            : <InputPlaceholder>Kinos auswählen</InputPlaceholder>
          }
        </InputBase>
      </ComboboxTarget>

      <ComboboxDropdown>
        <ComboboxOptions>{options}</ComboboxOptions>
      </ComboboxDropdown>
    </Combobox >
  );
}
