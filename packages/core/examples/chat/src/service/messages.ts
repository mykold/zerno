// TODO: Deprecate standalone `ZernoMessage` document.
// Messages should be stored as an array inside a user-specific log document.
// See {@link GroupService.sendMessage} TODO

export interface ZernoMessage {
  // We store the author explicitly because `membersWithAccess` does not guarantee
  // ordering by add time. Since the message has the same admins as the group, we
  // identify its single author using `.id.toBytes()`.
  author: Uint8Array /* @automerge/automerge-repo-keyhive:Identifier */;
  content: string;
}
