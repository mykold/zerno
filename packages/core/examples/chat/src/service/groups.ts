import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import { Access } from "zerno-core";
import type { Zerno } from "zerno-core";
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive";

import { applyQueryOption } from "./query-option.js";
import type { QueryOption } from "./query-option.js";
import type { ZernoMessage } from "./messages.js";
import type { PhonebookService } from "./phonebook.js";

export interface ZernoGroup {
  name: string;
  // TODO: Consider replacing with a map-based set (`Record<AutomergeUrl, true>`) for O(1) lookups
  phonebookId: AutomergeUrl;
  messages: AutomergeUrl[];
}

export class GroupService {
  constructor(
    private readonly zerno: Zerno,
    private readonly phonebooks: PhonebookService,
  ) {}

  async find(
    groupId: AutomergeUrl,
    timeout: number = 60_000 /* ms */,
  ): Promise<DocHandle<ZernoGroup>> {
    // TODO: Specify 'AbortOptions'
    const signal = AbortSignal.timeout(timeout);
    return await this.zerno.documents.find<ZernoGroup>(groupId, { signal });
  }

  async findMessages(args: {
    group: DocHandle<ZernoGroup>;
    option?: QueryOption;
  }): Promise<DocHandle<ZernoMessage>[]> {
    const messages = applyQueryOption(args.group.doc().messages, args.option);
    return Promise.all(
      messages.map((id) => this.zerno.documents.find<ZernoMessage>(id)),
    );
  }

  async sendMessage(args: {
    groupId: AutomergeUrl;
    message: ZernoMessage;
  }): Promise<DocHandle<ZernoMessage>> {
    // TODO: Refactor message storage to "User-Append-Only Log" pattern.
    //
    // Currently, we create a new Keyhive document for EVERY single message.
    // Since each document creates its own BeeKEM tree, this leads to an explosion
    // of encryption trees and RIBLT sync states. At ~10,000 messages, the sync
    // performance will degrade significantly.
    //
    // 1. Instead of 1 doc per message, create 1 doc per USER per GROUP (e.g. `MemberLog`).
    // 2. Grant `Write` access ONLY to the specific user (to preserve message integrity).
    // 3. Grant `Read` access to the rest of the Group.
    // 4. The user appends new messages into an array inside their own `MemberLog` document.
    // 5. The UI (MessageList) subscribes to all MemberLogs in the group, merges their
    //    message arrays, and sorts them by timestamp for rendering.

    // TODO: Potential issue with the current access model.
    //
    // When a new member joins a group, they need read access to all existing
    // messages. However, messages may have different owners, and the group admin
    // may not be able to grant access to messages owned by other members.
    //
    // Possible solutions:
    // 1. Grant access asynchronously when message owners come online.
    // 2. Sign messages with the author's private key, allowing clients to verify
    //    authenticity without requiring the author's involvement.
    //    Signatures would not prevent authorized users from modifying messages, but
    //    would let clients detect that the content no longer matches the author's
    //    signature.
    //
    // Data authenticity and availability are separate concerns; Zerno probably
    // should not guarantee permanent data preservation.

    const group = await this.find(args.groupId);

    // Create the message
    const message = await this.zerno.documents.create(args.message);

    // Grant the read access to the message to all group members except admins
    // Grant the admin access to the message to all group admins
    for (const member of await this.zerno.access.members(args.groupId)) {
      if (member.isSyncServer) continue;
      if (member.id === uint8ArrayToHex(this.zerno.identity.me().id.toBytes()))
        continue;

      const contactCard = await this.phonebooks.resolve({
        phonebookId: group.doc().phonebookId,
        identifier: member.id,
      });
      // NOTE: Shoud never happen, because we call `.add()` at the moment group created or members added
      if (!contactCard) {
        console.log(
          `[GroupService] Not found contact card for '${member.id}' in '${group.doc().phonebookId}'`,
        );
        continue;
      }

      await this.zerno.access.grant({
        document: message.url,
        contactCard: contactCard,
        access: member.access.atLeast(Access.admin())
          ? Access.admin()
          : Access.read(),
      });
    }

    // Add the message to the group
    group.change((d) => d.messages.push(message.url));

    return message;
  }
}
