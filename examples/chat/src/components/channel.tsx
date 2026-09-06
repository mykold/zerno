import React from "react";
import { Box, Text } from "ink";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocument, useMembers } from "zerno-react";

import type { ZernoChannel } from "../service/index.js";
import { shrinkIdentifier, identifierColor } from "../utilities.js";

export interface ChannelProps {
  channelId: AutomergeUrl | undefined;
}

export function Channel({ channelId }: ChannelProps): React.JSX.Element {
  const [channel] = useDocument<ZernoChannel>(channelId);
  const members = useMembers(channelId) ?? [];

  if (!channelId) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>Select a channel to view info</Text>
      </Box>
    );
  }
  if (!channel) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>channel is loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="#FFFFFF">{channel.name}</Text>
        <Text dimColor>
          {members.length} {members.length === 1 ? "member" : "members"}
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text dimColor>url</Text>
        <Text color="yellow">
          {shrinkIdentifier(channelId.slice("automerge:".length), 10, 6)}
        </Text>
        <Text dimColor>{"\\>"} use /copy channel-url</Text>
      </Box>
      <Box flexDirection="column">
        <Text dimColor>members</Text>
        <Box flexDirection="column">
          {members.map((member) => {
            const role = member.access.toString().toLowerCase();
            return (
              <Box
                key={member.id}
                flexDirection="row"
                justifyContent="space-between"
              >
                <Text color={identifierColor(member.id)}>
                  {shrinkIdentifier(member.id, 6, 4)}
                </Text>
                <Text color="#00FFFF" dimColor>
                  {role}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
