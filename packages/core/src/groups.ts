import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import {
  Power,
  ContactCard,
  Identifier,
} from "@automerge/automerge-repo-keyhive";
import {
  hexToUint8Array,
  uint8ArrayToHex,
} from "@automerge/automerge-repo-keyhive/dist/utilities.js";
import type { PowerService } from "./power.js";
import type { DocumentService } from "./document.js";
import { sanitazeIdentifier } from "./power.js";

export interface GroupMember {
  id: Identifier;
  power: Power;
}

interface GroupMemberRecord {
  contactCard: Uint8Array; /* ContactCard.toBytes() */
  power: string; /* Power.toString(): "relay" | "read" | "edit" | "admin" */
}

interface GroupDocumentRecord {
  id: AutomergeUrl;
  power: string; /* Power.toString() */
}

export interface Group {
  members: Record<string /* Identifier hex */, GroupMemberRecord>;
  documents: GroupDocumentRecord[];
}

/**
 * Reverted from keyhive's native Group API (2663f5f, e1bd49d): its CGKA
 * membership never got the "nudge" that gives a new member a derivable
 * decryption key, so joins were unreliable (~50% pass rate in testing)
 * even after patching that gap. Too immature to build on right now —
 * revisit once keyhive's Group API matures.
 *
 * A group here is just a synced document listing members (with their
 * ContactCard, for granting them documents added later) and documents
 * (with the power granted for each). `grant`/`addDocument` below
 * replicate "one grant covers future members and documents" by directly
 * granting each member each document, capped at the lower of the two
 * powers (same rule keyhive itself uses).
 */
export class GroupService {
  constructor(
    private readonly documents: DocumentService,
    private readonly power: PowerService,
  ) {}

  async create(): Promise<DocHandle<Group>> {
    return await this.documents.create<Group>({
      members: {},
      documents: [],
    });
  }

  /** Resolves a group by its url */
  async find(url: AutomergeUrl): Promise<DocHandle<Group>> {
    return await this.documents.find<Group>(url);
  }

  /** Adds a member, granting them power over every document already in the group. */
  async grant(args: {
    group: DocHandle<Group>;
    contactCard: ContactCard;
    power: Power;
  }): Promise<void> {
    // Also grant the group document itself, so the member can read the
    // roster and call addDocument for their own documents later.
    await this.power.grant({
      id: args.group.url,
      member: args.contactCard,
      power: args.power,
    });

    for (const doc of args.group.doc().documents) {
      const docPower = Power.fromString(doc.power);
      await this.power.grant({
        id: doc.id,
        member: args.contactCard,
        power: args.power.atLeast(docPower) ? docPower : args.power,
      });
    }

    const idHex = uint8ArrayToHex(args.contactCard.id.toBytes());
    args.group.change((d) => {
      d.members[idHex] = {
        contactCard: args.contactCard.toBytes(),
        power: args.power.toString(),
      };
    });
  }

  /** Removes a member from the group (does not revoke past document grants). */
  async revoke(args: {
    group: DocHandle<Group>;
    member: Identifier | string;
  }): Promise<void> {
    const idHex = uint8ArrayToHex(sanitazeIdentifier(args.member).toBytes());
    args.group.change((d) => {
      delete d.members[idHex];
    });
  }

  /** Registers a document with the group, granting every current member power over it. */
  async addDocument(args: {
    group: DocHandle<Group>;
    id: AutomergeUrl;
    power: Power;
  }): Promise<void> {
    for (const member of Object.values(args.group.doc().members)) {
      const memberPower = Power.fromString(member.power);
      await this.power.grant({
        id: args.id,
        member: ContactCard.fromBytes(member.contactCard),
        power: memberPower.atLeast(args.power) ? args.power : memberPower,
      });
    }
    args.group.change((d) => {
      if (!d.documents.some((doc) => doc.id === args.id)) {
        d.documents.push({ id: args.id, power: args.power.toString() });
      }
    });
  }

  /** Returns all members of the group. */
  async members(group: DocHandle<Group>): Promise<GroupMember[]> {
    return Object.entries(group.doc().members).map(([idHex, member]) => ({
      id: new Identifier(hexToUint8Array(idHex)),
      power: Power.fromString(member.power),
    }));
  }
}
