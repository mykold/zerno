import React, { useMemo, useState } from "react";
import { Box } from "ink";
import TextInput from "ink-text-input";
import clipboard from "clipboardy";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { Access, decodeContactCard, encodeContactCard } from "zerno-core";
import type { Identity } from "zerno-core";
import { useDocHandle } from "zerno-react";

import { useToast } from "../hooks/use-toast.js";
import type { ToastContextValue } from "../hooks/use-toast.js";
import type { Service, ZernoGroup, ZernoWorkspace } from "../service/index.js";

// MARK: ArgumentParser

function createArgumentParser<T>(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);

  return {
    value: value.trim(),
    length: tokens.length,
    next<T = string>(parser?: (value: string) => T): T {
      const token = tokens.shift();
      if (token === undefined) throw new Error("Not enough arguments");
      return parser ? parser(token) : (token as unknown as T);
    },
    rest(): string {
      const res = tokens.join(" ");
      tokens.length = 0;
      return res;
    },
  };
}
type ArgumentParser = ReturnType<typeof createArgumentParser>;

// MARK: CommandInput

export interface CommandInputProps {
  service: Service;
  workspaceId: AutomergeUrl;
  selectedGroupId: AutomergeUrl | undefined;
  borderColor: string | undefined;
  disabled: boolean;
}

interface CreateCommandsProps {
  service: Service;
  workspace: DocHandle<ZernoWorkspace>;
  selectedGroup: DocHandle<ZernoGroup> | undefined;
  sendToast: ToastContextValue["sendToast"];
}

function createCommands({
  service,
  workspace,
  selectedGroup,
  sendToast,
}: CreateCommandsProps) {
  async function newGroup(args: ArgumentParser): Promise<void> {
    const name = args.rest();
    if (name.length === 0) throw new Error("Group name cannot be empty");

    await service.workspaces.createGroup({ workspace, name });
    sendToast("success", "Group successfully created");
  }

  async function openGroup(args: ArgumentParser): Promise<void> {
    const id = args.next() as AutomergeUrl;
    if (!id) throw new Error("Id cannot be empty");

    sendToast("info", `Opening group '${id}'`);
    const group = await service.groups.find(id);

    await service.workspaces.openGroup({ workspace, group });
    sendToast("success", "Group successfully opened");
  }

  async function closeGroup(_: ArgumentParser): Promise<void> {
    if (!selectedGroup) throw new Error("Group is not selected");

    await service.workspaces.closeGroup({
      workspace,
      groupId: selectedGroup.url,
    });

    sendToast("success", "Group successfully closed");
  }

  async function copyContactCardOrGroupUrl(
    args: ArgumentParser,
  ): Promise<void> {
    switch (args.next()) {
      case "contact-card": {
        const text = encodeContactCard(service.zerno.identity.me().contactCard);
        clipboard.writeSync(text);
        sendToast("success", "Contact card copied to clipboard");
        break;
      }
      case "group-url": {
        if (!selectedGroup) throw new Error("Group is not selected");
        const text = selectedGroup.url.slice("automerge:".length);
        clipboard.writeSync(text);
        sendToast("success", "Group url copied to clipboard");
        break;
      }
      default: {
        throw new Error(
          "Invalid arguments. Usage: /copy <contact-card/group-url>",
        );
      }
    }
  }

  async function grantGroup(args: ArgumentParser): Promise<void> {
    if (!selectedGroup) throw new Error("Group is not selected");

    const access = args.next(Access.fromString);
    const contactCard = args.next(decodeContactCard);

    await service.workspaces.grantGroup({
      group: selectedGroup,
      contactCard,
      access,
    });
    sendToast("success", "Contact card added to phonebook and access granted");
  }

  async function sendMessage(args: ArgumentParser): Promise<void> {
    if (!selectedGroup) throw new Error("Group is not selected");
    if (args.value.length === 0) throw new Error("Message cannot be empty");

    await service.groups.sendMessage({
      group: selectedGroup,
      content: args.value,
    });
  }

  return {
    newGroup,
    openGroup,
    closeGroup,
    copyContactCardOrGroupUrl,
    grantGroup,
    sendMessage,
  };
}

export function CommandInput({
  service,
  workspaceId,
  selectedGroupId,
  disabled,
  borderColor,
}: CommandInputProps): React.JSX.Element {
  const { sendToast } = useToast();

  const workspace = useDocHandle<ZernoWorkspace>(workspaceId, {
    suspense: true,
  });
  const selectedGroup = useDocHandle<ZernoGroup>(selectedGroupId);

  const commands = useMemo(
    () =>
      createCommands({
        service,
        workspace,
        selectedGroup,
        sendToast,
      }),
    [service, workspace, selectedGroup, sendToast],
  );

  const [value, setValue] = useState("");
  function onChange(value: string) {
    if (disabled) return;
    setValue(value);
  }

  function onSubmit(value: string): void {
    value = value.trim();
    onChange("");

    const args = createArgumentParser(value);

    if (!args.value.startsWith("/")) {
      commands.sendMessage(args).catch((err: Error) => sendToast("error", err));
      return;
    }

    const handler = {
      "/new": commands.newGroup,
      "/open": commands.openGroup,
      "/close": commands.closeGroup,
      "/copy": commands.copyContactCardOrGroupUrl,
      "/grant": commands.grantGroup,
    }[args.next()];
    if (!handler) {
      sendToast("error", "Invalid command");
      return;
    }
    handler(args).catch((err: Error) => sendToast("error", err));
    return;
  }

  return (
    <Box
      borderStyle="single"
      width="100%"
      overflow="hidden"
      flexShrink={0}
      borderColor={borderColor}
    >
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={
          disabled
            ? "\\> Use [tab] to switch to command input"
            : "Type command here..."
        }
      />
    </Box>
  );
}
