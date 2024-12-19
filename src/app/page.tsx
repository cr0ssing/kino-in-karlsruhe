import { Button, Flex } from "@mantine/core";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <Flex justify="center" align="center" h="100vh">
        <Button>Click me</Button>
      </Flex>
    </HydrateClient>
  );
}
