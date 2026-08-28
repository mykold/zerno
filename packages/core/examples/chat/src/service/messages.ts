export interface ZernoMessage {
  // We store the author explicitly here because `findMessages` merges
  // all message lists into a single array.
  // author: string /* @automerge/automerge-repo-keyhive:Identifier */;
  content: string;
  createdAt: number;
  // TODO
  author: string /* Inherited from ZernoMessageList, @automerge/automerge-repo-keyhive:Identifier */;
}

export interface ZernoMessageList {
  messages: ZernoMessage[];
}
