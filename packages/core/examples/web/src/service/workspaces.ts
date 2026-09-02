import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo"
import { Access } from "zerno-core"
import type { ContactCard, Zerno } from "zerno-core"
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive"

import type { ZernoChannel } from "./channels.js"
import type { PhonebookService } from "./phonebook.js"

export interface ZernoWorkspace {
  // TODO: Consider replacing with a map-based set (`Record<AutomergeUrl, true>`) for O(1) lookups
  channels: AutomergeUrl[]
}

export class WorkspaceService {
  private readonly zerno: Zerno
  private readonly phonebooks: PhonebookService

  constructor(zerno: Zerno, phonebooks: PhonebookService) {
    this.zerno = zerno
    this.phonebooks = phonebooks
  }

  async openChannel(args: {
    workspace: DocHandle<ZernoWorkspace>
    channel: DocHandle<ZernoChannel>
  }): Promise<void> {
    if (args.workspace.doc().channels.some((c) => c === args.channel.url)) {
      throw new Error("Channel already opened in your workspace")
    }
    args.workspace.change((d) => d.channels.push(args.channel.url))
  }

  async create(): Promise<DocHandle<ZernoWorkspace>> {
    return await this.zerno.documents.create<ZernoWorkspace>({
      channels: [],
    })
  }

  async find(
    id: AutomergeUrl,
    timeout: number = 60_000 /* ms */
  ): Promise<DocHandle<ZernoWorkspace>> {
    const signal = AbortSignal.timeout(timeout)
    return await this.zerno.documents.find<ZernoWorkspace>(id, { signal })
  }

  async createChannel(args: {
    workspace: DocHandle<ZernoWorkspace>
    name: string
  }): Promise<DocHandle<ZernoChannel>> {
    // Create phonebook
    const phonebook = await this.phonebooks.create()

    // Add current user contact card to the phonebook
    const me = this.zerno.identity.me()
    await this.phonebooks.add({
      phonebookId: phonebook.url,
      contactCard: me.contactCard,
    })

    // Create the keyhive group and join it as admin, so the creator can manage
    // it the same way as the other admins and shows up in the member list
    const group = await this.zerno.groups.create()
    await this.zerno.groups.grant({
      group,
      contactCard: me.contactCard,
      access: Access.admin(),
    })

    // Grant the keyhive group access to the phonebook, so every current and
    // future member of the group can resolve contact cards
    await this.zerno.access.grant({
      id: phonebook.url,
      member: group,
      access: Access.read(),
    })

    // Create the channel document
    const channel = await this.zerno.documents.create<ZernoChannel>({
      name: args.name,
      groupId: uint8ArrayToHex(group.groupId.toBytes()),
      phonebookId: phonebook.url,
      messages: {},
    })

    // Grant the keyhive group access to the channel document
    await this.zerno.access.grant({
      id: channel.url,
      member: group,
      access: Access.read(),
    })

    // Flush capability grants immediately so peers get decryption keys ASAP.
    this.zerno.syncKeyhive()

    // Add the channel to the workspace
    args.workspace.change((d) => d.channels.push(channel.url))

    return channel
  }

  async editChannel(args: { channel: DocHandle<ZernoChannel>; name: string }) {
    if (!args.name.trim()) throw new Error("Channel name cannot be empty")
    if (args.channel.doc().name === args.name) return
    args.channel.change((d) => (d.name = args.name))
  }

  async closeChannel(args: {
    workspace: DocHandle<ZernoWorkspace>
    channelId: AutomergeUrl
  }): Promise<void> {
    // Remove the channel from the workspace
    args.workspace.change((d) => {
      const index = d.channels.indexOf(args.channelId)
      if (index !== -1) d.channels.splice(index, 1)
    })
  }

  async grantChannel(args: {
    channel: DocHandle<ZernoChannel>
    contactCard: ContactCard
    access: Access
  }) {
    const phonebookId = args.channel.doc().phonebookId
    await this.phonebooks.add({
      phonebookId,
      contactCard: args.contactCard,
    })

    // Membership in the keyhive group grants access to all of the channel's
    // documents, including the ones created later
    const group = await this.zerno.groups.find(args.channel.doc().groupId)
    await this.zerno.groups.grant({
      group,
      contactCard: args.contactCard,
      access: args.access,
    })

    // Flush capability grants immediately so peers get decryption keys ASAP.
    this.zerno.syncKeyhive()
  }
}
