import type { AutomergeUrl, Repo } from "@automerge/automerge-repo";
import {
  Access,
  Identifier,
  type AutomergeRepoKeyhive,
  type ContactCard,
  type DocMember,
} from "@automerge/automerge-repo-keyhive";
import {
  hexToUint8Array,
  uint8ArrayToHex,
} from "@automerge/automerge-repo-keyhive/dist/utilities.js";
import { TtlCache } from "./cache.js";

export function sanitazeIdentifier(
  identifier: Identifier | string,
): Identifier {
  if (typeof identifier !== "string") return identifier;
  return new Identifier(hexToUint8Array(identifier));
}

const ACCESS_TTL = 60_000; /* ms */

function cacheKey(id: AutomergeUrl, member: Identifier): string {
  return `${id}:${uint8ArrayToHex(member.toBytes())}`;
}

export class AccessService {
  private readonly accessCache = new TtlCache<string, Access | undefined>(
    ACCESS_TTL,
  );
  private readonly membersCache = new TtlCache<AutomergeUrl, DocMember[]>(
    ACCESS_TTL,
  );

  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  /** Grants a contact card access to a document */
  async grant(args: {
    id: AutomergeUrl;
    contactCard: ContactCard;
    access: Access;
  }): Promise<void> {
    await this.hive.addMemberToDoc(args.id, args.contactCard, args.access);
    this.accessCache.delete(cacheKey(args.id, args.contactCard.id));
    this.membersCache.delete(args.id);
  }

  /** Revokes a member access from a document */
  async revoke(args: {
    id: AutomergeUrl;
    member: Identifier | string;
  }): Promise<void> {
    const member = sanitazeIdentifier(args.member);
    await this.hive.revokeMemberFromDoc(args.id, member);
    this.accessCache.delete(cacheKey(args.id, member));
    this.membersCache.delete(args.id);
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
    const cached = this.membersCache.get(id);
    if (cached) return cached;

    const members = await this.hive.listMembers(id);
    this.membersCache.set(id, members);
    return members;
  }

  /** Returns the access level of a given member */
  async getAccess(args: {
    id: AutomergeUrl;
    member: Identifier | string;
  }): Promise<Access | undefined> {
    const member = sanitazeIdentifier(args.member);

    const key = cacheKey(args.id, member);
    if (this.accessCache.has(key)) return this.accessCache.get(key);

    const access = await this.hive.bestAccessForDoc(member, args.id);
    this.accessCache.set(key, access);
    return access;
  }

  /** Returns true if the current user has at least the given access level */
  async hasAtLeast(args: {
    id: AutomergeUrl;
    member: Identifier | string;
    access: Access;
  }): Promise<boolean> {
    const member = sanitazeIdentifier(args.member);
    const access = await this.getAccess({ id: args.id, member: member });
    return access?.atLeast(args.access) ?? false;
  }

  /** Grants public access to a document */
  async grantPublicAccess(args: {
    id: AutomergeUrl;
    access: Access;
  }): Promise<void> {
    await this.hive.setPublicAccess(args.id, args.access);
    this.accessCache.clear();
  }

  /** Revokes public access to a document */
  async revokePublicAccess(id: AutomergeUrl): Promise<void> {
    await this.hive.revokeMemberFromDoc(id, Identifier.publicId());
    this.accessCache.clear();
  }
}
