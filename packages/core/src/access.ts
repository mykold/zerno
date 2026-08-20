import type { AutomergeUrl, Repo } from "@automerge/automerge-repo";
import {
  Access,
  Identifier,
  type AutomergeRepoKeyhive,
  type ContactCard,
  type DocMember,
} from "@automerge/automerge-repo-keyhive";
import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js";

export function sanitazeIdentifier(
  identifier: Identifier | string,
): Identifier {
  if (typeof identifier !== "string") return identifier;
  return new Identifier(hexToUint8Array(identifier));
}

export class AccessService {
  constructor(
    private readonly repo: Repo,
    private readonly hive: AutomergeRepoKeyhive,
  ) {}

  /** Grants a contact card access to a document */
  async grant(args: {
    id: AutomergeUrl;
    contactCard: ContactCard;
    access: Access;
  }): Promise<void> {
    await this.hive.addMemberToDoc(args.id, args.contactCard, args.access);
  }

  /** Revokes a member access from a document */
  async revoke(args: {
    id: AutomergeUrl;
    member: Identifier | string;
  }): Promise<void> {
    await this.hive.revokeMemberFromDoc(args.id, args.member);
  }

  /** Returns the members of a given document that have at least the given access level */
  async membersWithAccess(args: {
    id: AutomergeUrl;
    access: Access;
  }): Promise<DocMember[]> {
    const members: DocMember[] = [];
    for (const member of await this.members(args.id)) {
      // 'access' must be defined, since we call '.addSyncServerRelayToDoc'
      if (member.access?.atLeast(args.access)) members.push(member);
    }
    return members;
  }

  /** Returns the members of a given document */
  async members(id: AutomergeUrl): Promise<DocMember[]> {
    return this.hive.listMembers(id);
  }

  /** Returns the access level of a given member */
  async getAccess(args: {
    id: AutomergeUrl;
    member: Identifier | string;
  }): Promise<Access | undefined> {
    return this.hive.bestAccessForDoc(sanitazeIdentifier(args.member), args.id);
  }

  /** Returns true if the current user has at least the given access level */
  async hasAtLeast(args: {
    id: AutomergeUrl;
    member: Identifier | string;
    access: Access;
  }): Promise<boolean> {
    const access = await this.hive.bestAccessForDoc(
      sanitazeIdentifier(args.member),
      args.id,
    );
    return access?.atLeast(args.access) ?? false;
  }

  /** Grants public access to a document */
  async grantPublicAccess(args: {
    id: AutomergeUrl;
    access: Access;
  }): Promise<void> {
    await this.hive.setPublicAccess(args.id, args.access);
  }

  /** Revokes public access to a document */
  async revokePublicAccess(id: AutomergeUrl): Promise<void> {
    await this.hive.revokeMemberFromDoc(id, Identifier.publicId());
  }
}
