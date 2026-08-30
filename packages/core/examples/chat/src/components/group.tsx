import React from "react";
import { Box, Text } from "ink";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocument, useMembers } from "zerno-react";

import type { ZernoGroup } from "../service/index.js";
import { shrinkIdentifier, identifierColor } from "../utilities.js";

export interface GroupProps {
  groupId: AutomergeUrl | undefined;
}

export function Group({ groupId }: GroupProps): React.JSX.Element {
  const [group] = useDocument<ZernoGroup>(groupId);
  const members = useMembers(groupId) ?? [];

  if (!groupId) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>Select a group to view info</Text>
      </Box>
    );
  }
  if (!group) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>Group is loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="#FFFFFF">{group.name}</Text>
        <Text dimColor>
          {members.length} {members.length === 1 ? "member" : "members"}
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text dimColor>url</Text>
        <Text color="yellow">
          {shrinkIdentifier(groupId.slice("automerge:".length), 10, 6)}
        </Text>
        <Text dimColor>{"\\>"} use /copy group-url</Text>
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
