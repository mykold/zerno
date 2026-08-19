import React from "react";
import { Box, Text } from "ink";
import type { AutomergeUrl } from "@automerge/automerge-repo";

import { useDocument } from "@automerge/react/slim";

import { MessageItem } from "./message-item.js";
import { applyQueryOption } from "../service/index.js";
import type { ZernoGroup } from "../service/index.js";

export interface MessageListProps {
  groupId: AutomergeUrl | undefined;
  limit: number;
}

export function MessageList({
  groupId,
  limit,
}: MessageListProps): React.JSX.Element {
  const [group] = useDocument<ZernoGroup>(groupId);

  if (!group) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>Group is not selected</Text>
      </Box>
    );
  }
  if (group.messages.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No messages</Text>
      </Box>
    );
  }

  const messages = applyQueryOption(group.messages, {
    limit: limit,
    offset: Math.max(0, group.messages.length - limit),
  });

  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="flex-end">
      {messages.slice().map((url) => (
        <MessageItem key={url} url={url} />
      ))}
    </Box>
  );
}
