import React, { useMemo } from "react";
import { Box, Text } from "ink";
import type { AutomergeUrl } from "@automerge/automerge-repo";

import { useDocument, useDocuments } from "zerno-react";

import type {
  ZernoMessage,
  ZernoMessageList,
  ZernoGroup,
} from "../service/index.js";
import { applyQueryOption } from "../service/index.js";
import { identifierColor, shrinkIdentifier } from "../utilities.js";
import { useToast } from "../hooks/use-toast.js";

function formatRelativeTime(createdAt: number) {
  const seconds = Math.floor((Date.now() - createdAt) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3_600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

// MARK: MessageItem

interface MessageItemProps {
  author: string;
  item: ZernoMessage;
}

export function MessageItem({ author, item }: MessageItemProps) {
  return (
    <Box flexDirection="row" flexShrink={0}>
      <Box width={13} flexShrink={0}>
        <Text color={identifierColor(author)}>
          {shrinkIdentifier(author, 6, 4)}
        </Text>
      </Box>
      <Box flexGrow={1} paddingLeft={1} gap={1}>
        <Text dimColor>{formatRelativeTime(item.createdAt)}</Text>
        <Text wrap="wrap">{item.content}</Text>
      </Box>
    </Box>
  );
}

// MARK: MessageList

export interface MessageListProps {
  groupId: AutomergeUrl | undefined;
  limit: number;
}

export function MessageList({
  groupId,
  limit,
}: MessageListProps): React.JSX.Element {
  const [group] = useDocument<ZernoGroup>(groupId);

  const messageListUrls = useMemo(() => {
    if (!group?.messages) return [];
    return Object.values(group.messages);
  }, [group?.messages]);

  const [messageLists] = useDocuments<ZernoMessageList>(messageListUrls, {
    suspense: false,
  });

  // TODO: The speed will depend heavily on the number of messages;
  // we need to come up with a smart mechanism that will retrieve
  // only the most recent X messages.
  const messages = useMemo(() => {
    const messages: ZernoMessage[] = [];
    for (const doc of messageLists.values()) {
      if (!doc) continue;
      messages.push(...doc.messages);
    }
    messages.sort((a, b) => a.createdAt - b.createdAt);
    return applyQueryOption(messages, {
      limit,
      offset: Math.max(0, messages.length - limit),
    });
  }, [messageLists, limit]);

  if (!group) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No messages</Text>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No messages</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="flex-end">
      {messages.slice().map((item) => (
        <MessageItem
          key={`${item.author}-${item.createdAt}`}
          author={item.author}
          item={item}
        ></MessageItem>
      ))}
    </Box>
  );
}
