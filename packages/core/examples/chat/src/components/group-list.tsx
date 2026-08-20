import React from "react";
import { Box, Text } from "ink";
import type { DocHandle } from "@automerge/automerge-repo";

import type { ZernoGroup } from "../service/index.js";

export interface GroupListProps {
  groups: DocHandle<ZernoGroup>[];
  selectedGroup: number | undefined;
}

export function GroupList({
  groups,
  selectedGroup,
}: GroupListProps): React.JSX.Element {
  if (groups.length === 0)
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No groups</Text>
      </Box>
    );

  return (
    <Box flexDirection="column">
      {groups.map((group, i) => (
        <Box key={group.url}>
          <Text color="yellow">{i === selectedGroup ? "> " : "  "}</Text>
          <Text wrap="wrap">{group.doc().name}</Text>
        </Box>
      ))}
    </Box>
  );
}
