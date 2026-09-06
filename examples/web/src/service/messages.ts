export interface ZernoMessage {
  id: string
  // We store the author explicitly here because `findMessages` merges
  // all message lists into a single array.
  // author: string /* @automerge/automerge-repo-keyhive:Identifier */;
  content: string
  author: string /* Inherited from ZernoMessageList, @automerge/automerge-repo-keyhive:Identifier */
  createdAt: number
  editedAt?: number
}

export interface ZernoMessageList {
  messages: ZernoMessage[]
}
