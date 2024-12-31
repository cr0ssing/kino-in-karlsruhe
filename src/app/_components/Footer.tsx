import { Anchor, Group, Text } from "@mantine/core";
import Link from "next/link";

export default function Footer() {
  return (
    <Group gap={0} justify="center" p="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-4)' }}>
      <Text size="sm">Made with ❤️ in Karlsruhe
        • <Anchor component={Link} href="/impressum">Impressum</Anchor>&#20;
        • <Anchor component={Link} href="https://github.com/cr0ssing/kino-in-karlsruhe">Quellcode</Anchor>
      </Text>
    </Group>
  );
}
