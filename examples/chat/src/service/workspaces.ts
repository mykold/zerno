import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { Access } from "zerno-core";
import type { ContactCard, Zerno } from "zerno-core";

import type { ZernoChannel } from "./channels.js";
import type { PhonebookService } from "./phonebook.js";

export interface ZernoWorkspace {
  // TODO: Consider replacing with a map-based set (`Record<AutomergeUrl, true>`) for O(1) lookups
  channels: AutomergeUrl[];
}

export class WorkspaceService {
  constructor(
    private readonly zerno: Zerno,
    private readonly phonebooks: PhonebookService,
  ) {}

  async openChannel(args: {
    workspace: DocHandle<ZernoWorkspace>;
    channel: DocHandle<ZernoChannel>;
  }): Promise<void> {
    if (args.workspace.doc().channels.some((g) => g === args.channel.url)) {
      throw new Error("Group already opened in your workspace");
    }
    args.workspace.change((d) => d.channels.push(args.channel.url));
  }

  async create(): Promise<DocHandle<ZernoWorkspace>> {
    return await this.zerno.documents.create<ZernoWorkspace>({
      channels: [],
    });
  }

  async find(
    id: AutomergeUrl,
    timeout: number = 60_000 /* ms */,
  ): Promise<DocHandle<ZernoWorkspace>> {
    const signal = AbortSignal.timeout(timeout);
    return await this.zerno.documents.find<ZernoWorkspace>(id, { signal });
  }

  async createChannel(args: {
    workspace: DocHandle<ZernoWorkspace>;
    name: string;
  }): Promise<DocHandle<ZernoChannel>> {
    // Create phonebook
    const phonebook = await this.phonebooks.create();

    // Add current user contact card to the phonebook
    const me = this.zerno.identity.me();
    await this.phonebooks.add({
      phonebookId: phonebook.url,
      contactCard: me.contactCard,
    });

    // Create the channel
    const channel = await this.zerno.documents.create<ZernoChannel>({
      name: args.name,
      phonebookId: phonebook.url,
      messages: {},
    });

    // Add the channel to the workspace
    args.workspace.change((d) => d.channels.push(channel.url));

    return channel;
  }

  async closeChannel(args: {
    workspace: DocHandle<ZernoWorkspace>;
    channelId: AutomergeUrl;
  }): Promise<void> {
    // Remove the channel from the workspace
    args.workspace.change((d) => {
      const index = d.channels.indexOf(args.channelId);
      if (index !== -1) d.channels.splice(index, 1);
    });
  }

  async grantChannel(args: {
    channel: DocHandle<ZernoChannel>;
    contactCard: ContactCard;
    access: Access;
  }) {
    const phonebookId = args.channel.doc().phonebookId;
    await this.phonebooks.add({
      phonebookId,
      contactCard: args.contactCard,
    });

    // Grant access to the group
    await this.zerno.access.grant({
      id: args.channel.url,
      member: args.contactCard,
      access: args.access,
    });

    // Grant access to the phonebook of the group
    await this.zerno.access.grant({
      id: phonebookId,
      member: args.contactCard,
      access: args.access,
    });

    // Grant access to all message lists of the group
    for (const messageList of Object.values(args.channel.doc().messages)) {
      await this.zerno.access.grant({
        id: messageList,
        member: args.contactCard,
        access: args.access,
      });
    }
  }
}
