import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo"
import { Access } from "zerno-core"
import type { Zerno } from "zerno-core"
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive"

import type { ZernoMessageList } from "./messages.js"

export interface ZernoChannel {
  name: string
  groupId: string /* Keyhive GroupId */
  phonebookId: AutomergeUrl
  messages: Record<string /* Identifier */, AutomergeUrl /* ZernoMessageList */>
}

export class ChannelService {
  private readonly zerno: Zerno

  constructor(zerno: Zerno) {
    this.zerno = zerno
  }

  async find(
    channelId: AutomergeUrl,
    timeout: number = 60_000 /* ms */
  ): Promise<DocHandle<ZernoChannel>> {
    // documents.find retries internally while the document is unavailable
    // (e.g. keyhive capability grants still in flight).
    return await this.zerno.documents.find<ZernoChannel>(channelId, {
      signal: AbortSignal.timeout(timeout),
    })
  }

  async sendMessage(args: {
    channel: DocHandle<ZernoChannel>
    content: string
  }) {
    const author = uint8ArrayToHex(this.zerno.identity.me().id.toBytes())

    let messageList: DocHandle<ZernoMessageList>

    const messageListId = args.channel.doc().messages[author]
    if (!messageListId) {
      messageList = await this.zerno.documents.create<ZernoMessageList>({
        messages: [],
      })

      // Members of the keyhive group get access to the new message list,
      // including the ones that join later
      const group = await this.zerno.groups.find(args.channel.doc().groupId)
      await this.zerno.access.grant({
        id: messageList.url,
        member: group,
        access: Access.read(),
      })
    } else {
      messageList =
        await this.zerno.documents.find<ZernoMessageList>(messageListId)
    }

    messageList.change((d) =>
      d.messages.push({
        id: crypto.randomUUID(), // TODO
        author,
        content: args.content.trim(),
        createdAt: Date.now(),
      })
    )

    // Flush capability grants immediately so peers get decryption keys ASAP.
    this.zerno.syncKeyhive()

    if (!args.channel.doc().messages[author]) {
      args.channel.change((d) => (d.messages[author] = messageList.url))
    }
  }

  editMessage(args: {
    messageList: DocHandle<ZernoMessageList>
    id: string
    content: string
  }): void {
    args.messageList.change((d) => {
      const message = d.messages.find((message) => message.id === args.id)
      if (!message) throw new Error("Message not found")
      if (message.content === args.content.trim()) return
      message.content = args.content.trim()
      message.editedAt = Date.now()
    })
  }

  deleteMessage(args: {
    messageList: DocHandle<ZernoMessageList>
    id: string
  }): void {
    args.messageList.change((d) => {
      const index = d.messages.findIndex((message) => message.id === args.id)
      if (index === -1) throw new Error("Message not found")
      d.messages.splice(index, 1)
    })
  }
}
