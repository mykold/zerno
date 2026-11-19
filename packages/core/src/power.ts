import type { AutomergeUrl } from "@automerge/automerge-repo";
import { Power, Identifier } from "@automerge/automerge-repo-keyhive";
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

const POWER_TTL = 60_000; /* ms */

function cacheKey(id: AutomergeUrl, member: Identifier): string {
  return `${id}:${uint8ArrayToHex(member.toBytes())}`;
}

export class PowerService {
  private readonly powerCache = new TtlCache<string, Power | undefined>(
    POWER_TTL,
  );
  private readonly membersCache = new TtlCache<AutomergeUrl, DocMember[]>(
    POWER_TTL,
  );

  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  /** Grants a contact card power over a document */
  async grant(args: {
    id: AutomergeUrl;
    member: ContactCard;
    power: Power;
  }): Promise<void> {
    await this.hive.addMemberToDoc(args.id, args.member, args.power);
    this.powerCache.delete(cacheKey(args.id, args.member.id));
    this.membersCache.delete(args.id);
  }

  /** Revokes a member power from a document */
  async revoke(args: {
    id: AutomergeUrl;
    member: Identifier | string;
  }): Promise<void> {
    const member = sanitazeIdentifier(args.member);
    await this.hive.revokeMemberFromDoc(args.id, member);
    this.powerCache.delete(cacheKey(args.id, member));
    this.membersCache.delete(args.id);
  }

  /** Returns the members of a given document that have at least the given power */
  async membersWithPower(args: {
    id: AutomergeUrl;
    power: Power;
  }): Promise<DocMember[]> {
    const members: DocMember[] = [];
    for (const member of await this.members(args.id)) {
      // 'access' must be defined, since we call '.addSyncServerRelayToDoc'
      if (member.access?.atLeast(args.power)) members.push(member);
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

  /** Returns the power of a given member */
  async getPower(args: {
    id: AutomergeUrl;
    member: Identifier | string;
  }): Promise<Power | undefined> {
    const member = sanitazeIdentifier(args.member);

    const key = cacheKey(args.id, member);
    if (this.powerCache.has(key)) return this.powerCache.get(key);

    const power = await this.hive.accessForDoc(member, args.id);
    this.powerCache.set(key, power);
    return power;
  }

  /** Returns true if the current user has at least the given power */
  async hasAtLeast(args: {
    id: AutomergeUrl;
    member: Identifier | string;
    power: Power;
  }): Promise<boolean> {
    const member = sanitazeIdentifier(args.member);
    const power = await this.getPower({ id: args.id, member: member });
    return power?.atLeast(args.power) ?? false;
  }
}
