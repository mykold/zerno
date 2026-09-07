import type { ImmutableString } from "@automerge/automerge-repo"

export interface ZernoMessage {
  id: string
  content: ImmutableString
  // We store the author explicitly here because `findMessages` merges
  // all message lists into a single array.
  // author: string /* @automerge/automerge-repo-keyhive:Identifier */;
  author: string /* Inherited from ZernoMessageList, @automerge/automerge-repo-keyhive:Identifier */
  createdAt: number
  editedAt?: number
}

export interface ZernoMessageList {
  messages: ZernoMessage[]
}
