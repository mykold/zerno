import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import { Access } from "zerno-core";
import type { Zerno } from "zerno-core";
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive";

import { applyQueryOption } from "./query-option.js";
import type { QueryOption } from "./query-option.js";
import type { ZernoMessageList, ZernoMessage } from "./messages.js";
import type { PhonebookService } from "./phonebook.js";

export interface ZernoGroup {
  name: string;
  // TODO: Consider replacing with a map-based set (`Record<AutomergeUrl, true>`) for O(1) lookups
  phonebookId: AutomergeUrl;
  messages: Record<
    string /* Identifier */,
    AutomergeUrl /* ZernoMessageList */
  >;
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
    const signal = AbortSignal.timeout(timeout);
    return await this.zerno.documents.find<ZernoGroup>(groupId, { signal });
  }

  async sendMessage(args: { group: DocHandle<ZernoGroup>; content: string }) {
    const author = uint8ArrayToHex(this.zerno.identity.me().id.toBytes());
    let messageListId = args.group.doc().messages[author];

    let messageList: DocHandle<ZernoMessageList>;
    if (!messageListId) {
      messageList = await this.zerno.documents.create<ZernoMessageList>({
        messages: [],
      });
      messageListId = messageList.url;
    } else {
      messageList =
        await this.zerno.documents.find<ZernoMessageList>(messageListId);
      messageListId = messageList.url;
    }

    messageList.change((d) =>
      d.messages.push({
        author,
        content: args.content,
        createdAt: Date.now(),
      }),
    );

    const members = await this.zerno.access.members(args.group.url);
    for (const member of members) {
      if (member.isSyncServer) continue;
      if (member.id === author) continue;

      // Skip if the member already has access
      const hasAccess = await this.zerno.access.hasAtLeast({
        id: messageList.url,
        member: member.id,
        access: Access.read(),
      });
      if (hasAccess) continue;

      const contactCard = await this.phonebooks.resolve({
        phonebookId: args.group.doc().phonebookId,
        identifier: member.id,
      });
      await this.zerno.access.grant({
        id: messageList.url,
        contactCard,
        access: Access.read(),
      });
    }

    if (!args.group.doc().messages[author]) {
      args.group.change((d) => (d.messages[author] = messageList.url));
    }
  }
}
