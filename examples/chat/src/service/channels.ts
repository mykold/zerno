import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { Access } from "zerno-core";
import type { Zerno } from "zerno-core";
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive";

import type { ZernoMessageList } from "./messages.js";
import type { PhonebookService } from "./phonebook.js";

export interface ZernoChannel {
  name: string;
  phonebookId: AutomergeUrl;
  messages: Record<
    string /* Identifier */,
    AutomergeUrl /* ZernoMessageList */
  >;
}

export class ChannelService {
  constructor(
    private readonly zerno: Zerno,
    private readonly phonebooks: PhonebookService,
  ) {}

  async find(
    channelId: AutomergeUrl,
    timeout: number = 60_000 /* ms */,
  ): Promise<DocHandle<ZernoChannel>> {
    // documents.find retries internally while the document is unavailable
    // (e.g. keyhive capability grants still in flight).
    return await this.zerno.documents.find<ZernoChannel>(channelId, {
      signal: AbortSignal.timeout(timeout),
    });
  }

  async sendMessage(args: {
    channel: DocHandle<ZernoChannel>;
    content: string;
  }) {
    const author = uint8ArrayToHex(this.zerno.identity.me().id.toBytes());
    let messageListId = args.channel.doc().messages[author];

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

    const members = await this.zerno.access.members(args.channel.url);
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
        phonebookId: args.channel.doc().phonebookId,
        identifier: member.id,
      });
      await this.zerno.access.grant({
        id: messageList.url,
        member: contactCard,
        access: Access.read(),
      });
    }

    // Flush capability grants immediately so peers get decryption keys ASAP.
    this.zerno.syncKeyhive();

    if (!args.channel.doc().messages[author]) {
      args.channel.change((d) => (d.messages[author] = messageList.url));
    }
  }
}
