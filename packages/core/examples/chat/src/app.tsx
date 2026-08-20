import React, { useEffect, useState } from "react";
import { render as inkRender, Box, Text, useInput, useWindowSize } from "ink";
import { Spinner, StatusMessage } from "@inkjs/ui";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import { encodeContactCard } from "zerno-core";
import { ZernoProvider } from "zerno-react";

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
  const { toasts, sendToast } = useToast();

  const [workspace, setWorkspace] = useState<DocHandle<ZernoWorkspace> | null>(
    null,
  );
  useEffect(() => {
    service.workspaces
      .find(workspaceId)
      .then(setWorkspace)
      .catch((err: Error) => sendToast("error", err.message));
  }, [workspaceId]);

  // TODO: Refactor with zerno-react:useDocuments
  const [groups, setGroups] = useState<DocHandle<ZernoGroup>[]>([]);
  useEffect(() => {
    if (!workspace) return;
    const setGroupsListener = (): void =>
      void service.workspaces
        .findGroups({ workspace: workspace.doc() })
        .then(setGroups)
        .catch((err: Error) => sendToast("error", err.message));
    setGroupsListener();
    workspace.on("change", setGroupsListener);
    return (): void => void workspace.off("change", setGroupsListener);
  }, [workspace]);

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

  const [selectedGroup, setSelectedGroup] = useState<number | undefined>();
  useEffect(() => {
    setSelectedGroup((i) => {
      if (groups.length === 0) return undefined;
      if (i === undefined || i >= groups.length) return groups.length - 1;
      return i;
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
        if (groups.length === 0) return;
        if (key.upArrow) {
          setSelectedGroup((i) => rotate(i ?? 0, groups.length, -1));
        } else if (key.downArrow) {
          setSelectedGroup((i) => rotate(i ?? 0, groups.length, 1));
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
          <GroupList groups={groups} selectedGroup={selectedGroup} />
        </Box>
        <Box
          flexGrow={1}
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
        >
          <Text color="#00FFFF">Messages</Text>
          <MessageList
            service={service}
            groupId={groups[selectedGroup!]?.url}
            limit={terminal.rows}
          />
        </Box>
        <Box
          width="30%"
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
        >
          <Text color="#00FFFF">Group</Text>
          <Group service={service} group={groups[selectedGroup!]} />
        </Box>
      </Box>
      <CommandInput
        service={service}
        workspace={workspace}
        groups={groups}
        selectedGroup={selectedGroup}
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
