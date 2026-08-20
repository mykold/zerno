// TODO: Deprecate standalone `ZernoMessage` document.
// Messages should be stored as an array inside a user-specific log document.
// See {@link GroupService.sendMessage} TODO

export interface ZernoMessage {
  // We store the author explicitly here because `findMessages` merges
  // all message lists into a single array.
  // author: string /* @automerge/automerge-repo-keyhive:Identifier */;
  content: string;
  createdAt: number;
  author: string /* Inherited from ZernoMessageList, @automerge/automerge-repo-keyhive:Identifier */;
}

export interface ZernoMessageList {
  messages: ZernoMessage[];
}
