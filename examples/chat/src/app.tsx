import React, { useEffect, useState } from "react";
import { render as inkRender, Box, Text, useInput, useWindowSize } from "ink";
import { Spinner } from "@inkjs/ui";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { encodeContactCard } from "zerno-core";
import { useDocument, useDocuments, ZernoProvider } from "zerno-react";

import { useRing } from "./hooks/use-ring.js";
import { useToast, ToastProvider, Toast } from "./hooks/use-toast.js";
import type { Service, ZernoWorkspace, ZernoChannel } from "./service/index.js";
import { shrinkIdentifier, rotate } from "./utilities.js";
import {
  CommandInput,
  ChannelList,
  MessageList,
  Channel,
} from "./components/index.js";

export interface AppProps {
  service: Service;
  workspaceId: AutomergeUrl;
}

export function App({ service, workspaceId }: AppProps): React.JSX.Element {
  const terminal = useWindowSize();
  const { toasts } = useToast();

  const [workspace] = useDocument<ZernoWorkspace>(workspaceId, {
    suspense: true,
  });
  const [channels] = useDocuments<ZernoChannel>(workspace.channels, {
    suspense: false,
  });

  const boxes = ["command-input", "channels"] as const;
  const [selectedBox, setSelectedBox] = useState<(typeof boxes)[number]>(
    boxes[0],
  );

  const selectedBoxColor = useRing({
    values: ["#747474", "#CCCCCC"] as const,
    interval: 500,
    trigger: selectedBox,
  });

  const [selectedChannelId, setselectedChannelId] = useState<
    AutomergeUrl | undefined
  >();
  const channelIds = Array.from(channels.keys());
  useEffect(() => {
    setselectedChannelId((current) => {
      if (channelIds.length === 0) return undefined;
      if (current !== undefined && channels.has(current)) {
        return current;
      }
      return channelIds[channelIds.length - 1];
    });
  }, [channels]);

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
      case "channels": {
        const i = selectedChannelId ? channelIds.indexOf(selectedChannelId) : 0;
        if (channels.size === 0) return;
        if (key.upArrow) {
          setselectedChannelId(channelIds[rotate(i, channelIds.length, -1)]);
        } else if (key.downArrow) {
          setselectedChannelId(channelIds[rotate(i, channelIds.length, 1)]);
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

  if (terminal.columns < 60 || terminal.rows < 20)
    return <Text>Minimum terminal size is 60x20.</Text>;

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
          borderColor={
            selectedBox === "channels" ? selectedBoxColor : undefined
          }
        >
          <Text color="#00FFFF">Channels</Text>
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannelId}
          />
        </Box>
        <Box
          flexGrow={1}
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
        >
          <Text color="#00FFFF">Messages</Text>
          <MessageList channelId={selectedChannelId} limit={terminal.rows} />
        </Box>
        <Box
          width="30%"
          borderStyle="single"
          flexDirection="column"
          overflow="hidden"
        >
          <Text color="#00FFFF">Channel</Text>
          <Channel channelId={selectedChannelId} />
        </Box>
      </Box>
      <CommandInput
        service={service}
        workspaceId={workspaceId}
        selectedChannelId={selectedChannelId}
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
