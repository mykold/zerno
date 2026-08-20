import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type { DocHandle } from "@automerge/automerge-repo";

import { Access } from "zerno-core";
import type { DocMember } from "zerno-core";

import { useToast } from "../hooks/use-toast.js";
import type { Service, ZernoGroup } from "../service/index.js";
import { shrinkIdentifier, identifierColor } from "../utilities.js";

export interface GroupProps {
  service: Service;
  group: DocHandle<ZernoGroup> | undefined;
}

export function Group({ service, group }: GroupProps): React.JSX.Element {
  const { sendToast } = useToast();

  // TODO: Refactor with zerno-react:useDocuments
  const [members, setMembers] = useState<DocMember[]>([]);
  useEffect(() => {
    if (!group) return;
    const setMembersListener = (): void =>
      void service.zerno.access
        .membersWithAccess({ id: group.url, access: Access.read() })
        .then(setMembers)
        .catch((err: Error) => sendToast("error", err.message));
    setMembersListener();
    group.on("change", setMembersListener);
    return (): void => void group.off("change", setMembersListener);
  }, [group]);

  if (!group) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>Select a group to view info</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="#FFFFFF">{group.doc()?.name}</Text>
        <Text dimColor>
          {members.length} {members.length === 1 ? "member" : "members"}
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text dimColor>url</Text>
        <Text color="yellow">
          {shrinkIdentifier(group.url.slice("automerge:".length), 10, 6)}
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
