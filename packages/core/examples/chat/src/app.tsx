import React, { useEffect, useState } from "react";
import { render as inkRender, Box, Text, useInput, useWindowSize } from "ink";
import { Spinner } from "@inkjs/ui";
import type { AutomergeUrl } from "@automerge/automerge-repo";

import { encodeContactCard } from "zerno-core";
import { useDocument, useDocuments, ZernoProvider } from "zerno-react";

import { useRing } from "./hooks/use-ring.js";
import { useToast, ToastProvider, Toast } from "./hooks/use-toast.js";
import type { Service, ZernoWorkspace, ZernoGroup } from "./service/index.js";
import { shrinkIdentifier, rotate } from "./utilities.js";
import {
  CommandInput,
  GroupList,
  MessageList,
  Group,
} from "./components/index.js";

export interface AppProps {
  service: Service;
  workspaceId: AutomergeUrl;
}

const app = { columns: 60, rows: 12 };

export function App({ service, workspaceId }: AppProps): React.JSX.Element {
  const terminal = useWindowSize();
  const { toasts } = useToast();

  const [workspace] = useDocument<ZernoWorkspace>(workspaceId, {
    suspense: true,
  });
  const [groups] = useDocuments<ZernoGroup>(workspace.groups);

  const boxes = ["command-input", "groups"] as const;
  const [selectedBox, setSelectedBox] = useState<(typeof boxes)[number]>(
    boxes[0],
  );

  const selectedBoxColors = ["#747474", "#CCCCCC"] as const;
  const selectedBoxColor = useRing({
    values: selectedBoxColors,
    interval: 500,
    trigger: selectedBox,
  });

  const [selectedGroupId, setSelectedGroupId] = useState<
    AutomergeUrl | undefined
  >();
  const groupIds = Array.from(groups.keys());
  useEffect(() => {
    setSelectedGroupId((current) => {
      if (groupIds.length === 0) return undefined;
      if (current !== undefined && groups.has(current)) {
        return current;
      }
      return groupIds[groupIds.length - 1];
    });
  }, [groups]);

  useInput((input, key) => {
    if (key.tab) {
      const direction = key.shift ? -1 : 1;
      setSelectedBox((box) => {
        const index = boxes.indexOf(box);
        return boxes[rotate(index, boxes.length, direction)];
      });
      return;
    }

    switch (selectedBox) {
      case "groups": {
        const i = selectedGroupId ? groupIds.indexOf(selectedGroupId) : 0;
        if (groups.size === 0) return;
        if (key.upArrow) {
          setSelectedGroupId(groupIds[rotate(i, groupIds.length, -1)]);
        } else if (key.downArrow) {
          setSelectedGroupId(groupIds[rotate(i, groupIds.length, 1)]);
        }
        break;
      }
      case "command-input": {
        // <CommandInput /> handles it's own input by `disabled` property
        break;
      }
    }
  });

  const [me] = useState(() => service.zerno.identity.me());

  if (terminal.columns < app.columns || terminal.rows < app.rows) {
    return (
      <Text>
        Minimum terminal size is {app.columns}x{app.rows}.
      </Text>
    );
  }
  if (!workspace) {
    if (toasts.length !== 0) {
      return (
        <Box>
          {toasts.map((toast) => (
            <Box key={toast.id}>
              <Text>{toast.message}</Text>
            </Box>
          ))}
        </Box>
      );
    }
    return <Spinner label="Loading workspace..." />;
  }

  return (
    <Box flexDirection="column" width={terminal.columns} height={terminal.rows}>
      <Box
        borderStyle="single"
        width={terminal.columns}
        flexDirection="column"
        flexShrink={0}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="#00FFFF">zerno-chat</Text>
          <Text color="yellow" wrap="wrap">
            {shrinkIdentifier(encodeContactCard(me.contactCard), 24, 16)}
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor>tab ・ shift+tab ・ ↓ ・ ↑</Text>
          <Text dimColor>
            /new {"[name]"} ・ /grant {"[access] [contact-card]"} ・ /open{" "}
            {"[group-url]"} ・ /close ・ /copy {"[contact-card/group-url]"}
          </Text>
        </Box>
      </Box>
      <Box flexDirection="row" width="100%" flexGrow={1} overflow="hidden">
        <Box
          width="15%"
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
          borderColor={selectedBox === "groups" ? selectedBoxColor : undefined}
        >
          <Text color="#00FFFF">Groups</Text>
          <GroupList groups={groups} selectedGroupId={selectedGroupId} />
        </Box>
        <Box
          flexGrow={1}
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
        >
          <Text color="#00FFFF">Messages</Text>
          <MessageList groupId={selectedGroupId} limit={terminal.rows} />
        </Box>
        <Box
          width="30%"
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
        >
          <Text color="#00FFFF">Group</Text>
          <Group service={service} groupId={selectedGroupId} />
        </Box>
      </Box>
      <CommandInput
        service={service}
        workspaceId={workspaceId}
        selectedGroupId={selectedGroupId}
        me={me}
        borderColor={
          selectedBox === "command-input" ? selectedBoxColor : undefined
        }
        disabled={selectedBox !== "command-input"}
      />
      <Toast />
    </Box>
  );
}

export function render(props: AppProps) {
  return inkRender(
    <ZernoProvider zerno={props.service.zerno}>
      <ToastProvider>
        <App {...props} />
      </ToastProvider>
    </ZernoProvider>,
  );
}
