import React, { useState } from "react";
import { Box } from "ink";
import TextInput from "ink-text-input";
import clipboard from "clipboardy";
import type { AutomergeUrl, Doc, DocHandle } from "@automerge/automerge-repo";

import {
  Access,
  ContactCard,
  decodeContactCard,
  encodeContactCard,
} from "zerno-core";
import type { Identity } from "zerno-core";

import { useToast } from "../hooks/use-toast.js";
import type { Service, ZernoGroup, ZernoWorkspace } from "../service/index.js";
import { useDocHandle, useDocument } from "zerno-react";
import { Spinner } from "@inkjs/ui";

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
  me: Identity;
  borderColor: string | undefined;
  disabled: boolean;
}

export function CommandInput({
  service,
  workspaceId,
  selectedGroupId,
  me,
  disabled,
  borderColor,
}: CommandInputProps): React.JSX.Element {
  const { sendToast } = useToast();

  const workspace = useDocHandle<ZernoWorkspace>(workspaceId, {
    suspense: true,
  });
  const selectedGroup = useDocHandle<ZernoGroup>(selectedGroupId);

  const [value, setValue] = useState("");
  function onChange(value: string) {
    if (disabled) return;
    setValue(value);
  }

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
    if (!selectedGroupId) throw new Error("Group is not selected");

    await service.workspaces.closeGroup({
      workspace,
      groupId: selectedGroupId,
    });

    sendToast("success", "Group successfully closed");
  }

  async function copyContactCardOrGroupUrl(
    args: ArgumentParser,
  ): Promise<void> {
    switch (args.next()) {
      case "contact-card": {
        const text = encodeContactCard(me.contactCard);
        clipboard.writeSync(text);
        sendToast("success", "Contact card copied to clipboard");
        break;
      }
      case "group-url": {
        if (!selectedGroupId) throw new Error("Group is not selected");
        const text = selectedGroupId.slice("automerge:".length);
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

  const commands: Record<string, (value: ArgumentParser) => Promise<void>> = {
    "/new": newGroup,
    "/open": openGroup,
    "/close": closeGroup,
    "/copy": copyContactCardOrGroupUrl,
    "/grant": grantGroup,
  };

  function onSubmit(value: string): void {
    value = value.trim();
    onChange("");

    const args = createArgumentParser(value);

    if (!args.value.startsWith("/")) {
      sendMessage(args).catch((err: Error) => sendToast("error", err));
      return;
    }

    const handler = commands[args.next()];
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
