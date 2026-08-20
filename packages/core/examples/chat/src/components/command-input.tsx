import React, { useState } from "react";
import { Box } from "ink";
import TextInput from "ink-text-input";
import clipboard from "clipboardy";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import {
  Access,
  ContactCard,
  decodeContactCard,
  encodeContactCard,
} from "zerno-core";
import type { Identity } from "zerno-core";

import { useToast } from "../hooks/use-toast.js";
import type { Service, ZernoWorkspace, ZernoGroup } from "../service/index.js";

export interface CommandInputProps {
  service: Service;
  workspace: DocHandle<ZernoWorkspace>;
  groups: DocHandle<ZernoGroup>[];
  selectedGroup: number | undefined;
  me: Identity;
  borderColor: string | undefined;
  disabled: boolean;
}

export function CommandInput({
  service,
  workspace,
  groups,
  selectedGroup,
  me,
  disabled,
  borderColor,
}: CommandInputProps): React.JSX.Element {
  const { sendToast } = useToast();

  const [value, setValue] = useState("");

  function onChange(value: string) {
    if (disabled) return;
    setValue(value);
  }

  function newGroup(value: string): void {
    const name = value.slice("/new".length).trim();
    if (name.length === 0) {
      sendToast("error", "Group name cannot be empty");
      return;
    }
    service.workspaces
      .createGroup({
        workspaceId: workspace.url,
        name,
      })
      .then((group) => sendToast("success", "Group successfully created"))
      .catch((err: Error) => sendToast("error", err.message));
  }

  function openGroup(value: string): void {
    const id = value.slice("/open".length).trim() as AutomergeUrl;
    if (!id) {
      sendToast("error", "Id cannot be empty");
      return;
    }

    sendToast("info", "Opening group...");

    service.groups
      .find(id)
      .then((group) => {
        if (groups.some((g) => g.url === group.url)) {
          sendToast("error", "Group already opened in your workspace");
          return;
        }
        workspace.change((d) => d.groups.push(group.url));
      })
      .catch((err: Error) => sendToast("error", err.message));
  }

  function closeGroup(value: string): void {
    if (selectedGroup === undefined) {
      sendToast("error", "Group is not selected");
      return;
    }
    const group = groups[selectedGroup];

    service.workspaces
      .closeGroup({
        workspace,
        groupId: group.url,
      })
      .then(() => sendToast("success", `Group '${group.url}' closed`));
  }

  function copy(value: string): void {
    const args = value.slice("/copy".length).trim().split(/\s+/, 1);

    if (args.length !== 1) {
      sendToast(
        "error",
        "Invalid arguments. Usage: /copy <contact-card/group-url>",
      );
      return;
    }
    switch (args[0]) {
      case "contact-card": {
        clipboard.writeSync(encodeContactCard(me.contactCard));
        sendToast("success", "Contact card copied to clipboard");
        break;
      }
      case "group-url": {
        if (selectedGroup === undefined) {
          sendToast("error", "Group is not selected");
          return;
        }
        clipboard.writeSync(
          groups[selectedGroup!].url.slice("automerge:".length),
        );
        sendToast("success", "Group url copied to clipboard");
        break;
      }
      default: {
        sendToast(
          "error",
          "Invalid arguments. Usage: /copy <contact-card/group-url>",
        );
        break;
      }
    }
  }

  function grantGroup(value: string): void {
    if (selectedGroup === undefined) {
      sendToast("error", "Group is not selected");
      return;
    }
    const group = groups[selectedGroup];

    const args = value.slice("/grant".length).trim().split(/\s+/, 2);
    if (args.length !== 2) {
      sendToast(
        "error",
        "Invalid arguments. Usage: /grant <access> <contact-card>",
      );
      return;
    }

    let access: Access;
    try {
      access = Access.fromString(args[0]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendToast("error", message);
      return;
    }

    let contactCard: ContactCard;
    try {
      contactCard = decodeContactCard(args[1]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendToast("error", message);
      return;
    }

    service.workspaces
      .grantGroup({
        group,
        contactCard,
        access,
      })
      .then(() =>
        sendToast(
          "success",
          "Contact card added to phonebook and access granted",
        ),
      )
      .catch((err: Error) => sendToast("error", err.message));
  }

  function sendMessage(value: string): void {
    if (selectedGroup === undefined) {
      sendToast("error", "Group is not selected");
      return;
    }
    const group = groups[selectedGroup];

    value = value.trim();

    if (value.length === 0) {
      sendToast("error", "Message cannot be empty");
      return;
    }

    service.groups
      .sendMessage({
        group,
        content: value,
      })
      .catch((err: Error) => sendToast("error", err.message));
  }

  const commands: Record<string, (value: string) => void> = {
    "/new": newGroup,
    "/open": openGroup,
    "/close": closeGroup,
    "/copy": copy,
    "/grant": grantGroup,
  };

  function onSubmit(value: string): void {
    value = value.trim();
    const command = value.split(/\s+/)[0];

    onChange("");

    if (!command.startsWith("/")) {
      sendMessage(value);
      return;
    }

    const handler = commands[command];
    if (!handler) {
      sendToast("error", "Invalid command");
      return;
    }
    handler(value);
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
