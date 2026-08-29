import React from "react";
import { Box, Text } from "ink";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { DocMap } from "@automerge/react";

import type { ZernoGroup } from "../service/index.js";

export interface GroupListProps {
  groups: DocMap<ZernoGroup>;
  selectedGroupId: AutomergeUrl | undefined;
}

export function GroupList({
  groups,
  selectedGroupId,
}: GroupListProps): React.JSX.Element {
  if (groups.size === 0)
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No groups</Text>
      </Box>
    );

  return (
    <Box flexDirection="column">
      {Array.from(groups.entries()).map(([url, group]) => (
        <Box key={url}>
          <Text color="yellow">{url === selectedGroupId ? "> " : "  "}</Text>
          <Text wrap="wrap">{group.name}</Text>
        </Box>
      ))}
    </Box>
  );
}
