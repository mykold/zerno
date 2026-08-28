import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import { Access } from "zerno-core";
import type { ContactCard, Zerno } from "zerno-core";

import type { ZernoGroup } from "./groups.js";
import type { PhonebookService } from "./phonebook.js";

export interface ZernoWorkspace {
  // TODO: Consider replacing with a map-based set (`Record<AutomergeUrl, true>`) for O(1) lookups
  groups: AutomergeUrl[];
}

export class WorkspaceService {
  constructor(
    private readonly zerno: Zerno,
    private readonly phonebooks: PhonebookService,
  ) {}

  async openGroup(args: {
    workspace: DocHandle<ZernoWorkspace>;
    group: DocHandle<ZernoGroup>;
  }): Promise<void> {
    if (args.workspace.doc().groups.some((g) => g === args.group.url)) {
      throw new Error("Group already opened in your workspace");
    }
    args.workspace.change((d) => d.groups.push(args.group.url));
  }

  async create(): Promise<DocHandle<ZernoWorkspace>> {
    return await this.zerno.documents.create<ZernoWorkspace>({
      groups: [],
    });
  }

  async find(
    id: AutomergeUrl,
    timeout: number = 60_000 /* ms */,
  ): Promise<DocHandle<ZernoWorkspace>> {
    const signal = AbortSignal.timeout(timeout);
    return await this.zerno.documents.find<ZernoWorkspace>(id, { signal });
  }

  async createGroup(args: {
    workspace: DocHandle<ZernoWorkspace>;
    name: string;
  }): Promise<DocHandle<ZernoGroup>> {
    // Create phonebook
    const phonebook = await this.phonebooks.create();

    // Add current user contact card to the phonebook
    const me = this.zerno.identity.me();
    await this.phonebooks.add({
      phonebookId: phonebook.url,
      contactCard: me.contactCard,
    });

    // Create the group
    const group = await this.zerno.documents.create<ZernoGroup>({
      name: args.name,
      phonebookId: phonebook.url,
      messages: {},
    });

    // Add the group to the workspace
    args.workspace.change((d) => d.groups.push(group.url));

    return group;
  }

  async closeGroup(args: {
    workspace: DocHandle<ZernoWorkspace>;
    groupId: AutomergeUrl;
  }): Promise<void> {
    // Remove the group from the workspace
    args.workspace.change((d) => {
      const index = d.groups.indexOf(args.groupId);
      if (index !== -1) d.groups.splice(index, 1);
    });
  }

  async grantGroup(args: {
    group: DocHandle<ZernoGroup>;
    contactCard: ContactCard;
    access: Access;
  }) {
    const phonebookId = args.group.doc().phonebookId;
    await this.phonebooks.add({
      phonebookId,
      contactCard: args.contactCard,
    });

    // Grant access to the group
    await this.zerno.access.grant({
      id: args.group.url,
      contactCard: args.contactCard,
      access: args.access,
    });

    // Grant access to the phonebook of the group
    await this.zerno.access.grant({
      id: phonebookId,
      contactCard: args.contactCard,
      access: args.access,
    });

    // Grant access to all message lists of the group
    for (const messageList of Object.values(args.group.doc().messages)) {
      await this.zerno.access.grant({
        id: messageList,
        contactCard: args.contactCard,
        access: args.access,
      });
    }
  }
}
