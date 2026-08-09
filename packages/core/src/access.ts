import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  Access,
  Identifier,
  type AutomergeRepoKeyhive,
  type ContactCard,
  type DocMember,
} from "@automerge/automerge-repo-keyhive";
import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js";

export class AccessService {
  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  /** Grants a contact card access to a document */
  async grant(args: {
    document: AutomergeUrl;
    contactCard: ContactCard;
    access: Access;
  }): Promise<void> {
    await this.hive.addMemberToDoc(
      args.document,
      args.contactCard,
      args.access,
    );
  }

  /** Revokes a member access from a document */
  async revoke(args: {
    document: AutomergeUrl;
    member: Identifier | string;
  }): Promise<void> {
    await this.hive.revokeMemberFromDoc(args.document, args.member);
  }

  /** Returns the members of a given document that have at least the given access level */
  async membersWithAccess(args: {
    document: AutomergeUrl;
    access: Access;
  }): Promise<DocMember[]> {
    const members: DocMember[] = [];
    for (const member of await this.members(args.document)) {
      const access = await this.getAccess({
        document: args.document,
        member: member.id,
      });
      // 'access' must be defined, since we call '.addSyncServerRelayToDoc'
      if (access?.atLeast(args.access)) members.push(member);
    }
    return members;
  }

  /** Returns the members of a given document */
  async members(document: AutomergeUrl): Promise<DocMember[]> {
    return this.hive.listMembers(document);
  }

  /** Returns the access level of a given member */
  async getAccess(args: {
    document: AutomergeUrl;
    member: Identifier | string;
  }): Promise<Access | undefined> {
    return this.hive.bestAccessForDoc(
      typeof args.member === "string"
        ? new Identifier(hexToUint8Array(args.member))
        : args.member,
      args.document,
    );
  }

  /** Returns true if the current user has at least the given access level */
  async hasAtLeast(args: {
    document: AutomergeUrl;
    access: Access;
  }): Promise<boolean> {
    const id = this.hive.active.individual.id;
    const access = await this.hive.bestAccessForDoc(id, args.document);
    return access?.atLeast(args.access) ?? false;
  }

  /** Adds the public identity as a document member with the specified access level */
  async grantPublicAccess(args: {
    document: AutomergeUrl;
    access: Access;
  }): Promise<void> {
    await this.hive.setPublicAccess(args.document, args.access);
  }

  /** Removes the public identity from the document members */
  async revokePublicAccess(document: AutomergeUrl): Promise<void> {
    await this.hive.revokeMemberFromDoc(document, Identifier.publicId());
  }
}
