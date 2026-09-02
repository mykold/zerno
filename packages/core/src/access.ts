import {
  parseAutomergeUrl,
  type AutomergeUrl,
  type Repo,
} from "@automerge/automerge-repo";
import {
  Access,
  docIdFromAutomergeUrl,
  DocumentId,
  Group,
  Identifier,
} from "@automerge/automerge-repo-keyhive";
import type {
  AutomergeRepoKeyhive,
  ContactCard,
  DocMember,
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

function automergeUrlToDocumentId(url: AutomergeUrl): DocumentId {
  const { binaryDocumentId } = parseAutomergeUrl(url);
  return new DocumentId(binaryDocumentId);
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

  /** Grants a contact card or a keyhive group access to a document */
  async grant(args: {
    id: AutomergeUrl;
    member: ContactCard | Group;
    access: Access;
  }): Promise<void> {
    if (args.member instanceof Group) {
      // The keyhive wasm layer wants the raw document id, not an AutomergeUrl.
      const id = automergeUrlToDocumentId(args.id);
      const doc = await this.hive.keyhive.getDocument(id);
      if (!doc) throw new Error(`Keyhive document not found: ${args.id}`);

      await this.hive.keyhive.addMember(
        args.member.toAgent(),
        doc.toMembered(),
        args.access,
        [],
      );
      // Group membership changes the access of every member of the group.
      this.accessCache.clear();
    } else {
      await this.hive.addMemberToDoc(args.id, args.member, args.access);
      this.accessCache.delete(cacheKey(args.id, args.member.id));
    }

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
