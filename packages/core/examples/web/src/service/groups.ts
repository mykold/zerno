import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo"
import { Access } from "zerno-core"
import type { Zerno } from "zerno-core"
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive"

import type { ZernoMessageList } from "./messages.js"
import type { PhonebookService } from "./phonebook.js"

export interface ZernoGroup {
  name: string
  phonebookId: AutomergeUrl
  messages: Record<string /* Identifier */, AutomergeUrl /* ZernoMessageList */>
}

export class GroupService {
  private readonly zerno: Zerno
  private readonly phonebooks: PhonebookService

  constructor(zerno: Zerno, phonebooks: PhonebookService) {
    this.zerno = zerno
    this.phonebooks = phonebooks
  }

  async find(
    groupId: AutomergeUrl,
    timeout: number = 60_000 /* ms */
  ): Promise<DocHandle<ZernoGroup>> {
    // documents.find retries internally while the document is unavailable
    // (e.g. keyhive capability grants still in flight).
    return await this.zerno.documents.find<ZernoGroup>(groupId, {
      signal: AbortSignal.timeout(timeout),
    })
  }

  async sendMessage(args: { group: DocHandle<ZernoGroup>; content: string }) {
    const author = uint8ArrayToHex(this.zerno.identity.me().id.toBytes())

    let messageList: DocHandle<ZernoMessageList>

    const messageListId = args.group.doc().messages[author]
    if (!messageListId) {
      messageList = await this.zerno.documents.create<ZernoMessageList>({
        messages: [],
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

    const members = await this.zerno.access.members(args.group.url)
    for (const member of members) {
      if (member.isSyncServer) continue
      if (member.id === author) continue

      // Skip if the member already has access
      const hasAccess = await this.zerno.access.hasAtLeast({
        id: messageList.url,
        member: member.id,
        access: Access.read(),
      })
      if (hasAccess) continue

      const contactCard = await this.phonebooks.resolve({
        phonebookId: args.group.doc().phonebookId,
        identifier: member.id,
      })

      await this.zerno.access.grant({
        id: messageList.url,
        contactCard,
        access: Access.read(),
      })
    }

    // Flush capability grants immediately so peers get decryption keys ASAP.
    this.zerno.syncKeyhive()

    if (!args.group.doc().messages[author]) {
      args.group.change((d) => (d.messages[author] = messageList.url))
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
