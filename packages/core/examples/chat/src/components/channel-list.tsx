import React from "react";
import { Box, Text } from "ink";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { DocMap } from "@automerge/react";

import type { ZernoChannel } from "../service/index.js";

export interface ChannelListProps {
  channels: DocMap<ZernoChannel>;
  selectedChannelId: AutomergeUrl | undefined;
}

export function ChannelList({
  channels,
  selectedChannelId,
}: ChannelListProps): React.JSX.Element {
  if (channels.size === 0)
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No channels</Text>
      </Box>
    );

  return (
    <Box flexDirection="column">
      {Array.from(channels.entries()).map(([url, channel]) => (
        <Box key={url}>
          <Text color="yellow">{url === selectedChannelId ? "> " : "  "}</Text>
          <Text wrap="wrap">{channel.name}</Text>
        </Box>
      ))}
    </Box>
  );
}
