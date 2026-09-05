import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import {
  Access,
  ContactCard,
  Identifier,
} from "@automerge/automerge-repo-keyhive";
import {
  hexToUint8Array,
  uint8ArrayToHex,
} from "@automerge/automerge-repo-keyhive/dist/utilities.js";
import type { AccessService } from "./access.js";
import type { DocumentService } from "./document.js";
import { sanitazeIdentifier } from "./access.js";

export interface GroupMember {
  id: Identifier;
  access: Access;
}

interface GroupMemberRecord {
  contactCardJson: string;
  access: string; /* Access.toString(): "relay" | "read" | "edit" | "admin" */
}

interface GroupDocumentRecord {
  id: AutomergeUrl;
  access: string; /* Access.toString() */
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
 * (with the access level granted for each). `grant`/`addDocument` below
 * replicate "one grant covers future members and documents" by directly
 * granting each member each document, capped at the lower of the two
 * access levels (same rule keyhive itself uses).
 */
export class GroupService {
  constructor(
    private readonly documents: DocumentService,
    private readonly access: AccessService,
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

  /** Adds a member, granting them access to every document already in the group. */
  async grant(args: {
    group: DocHandle<Group>;
    contactCard: ContactCard;
    access: Access;
  }): Promise<void> {
    // Also grant the group document itself, so the member can read the
    // roster and call addDocument for their own documents later.
    await this.access.grant({
      id: args.group.url,
      member: args.contactCard,
      access: args.access,
    });

    for (const doc of args.group.doc().documents) {
      const docAccess = Access.fromString(doc.access);
      await this.access.grant({
        id: doc.id,
        member: args.contactCard,
        access: args.access.atLeast(docAccess) ? docAccess : args.access,
      });
    }

    const idHex = uint8ArrayToHex(args.contactCard.id.toBytes());
    args.group.change((d) => {
      d.members[idHex] = {
        contactCardJson: args.contactCard.toJson(),
        access: args.access.toString(),
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

  /** Registers a document with the group, granting every current member access to it. */
  async addDocument(args: {
    group: DocHandle<Group>;
    id: AutomergeUrl;
    access: Access;
  }): Promise<void> {
    for (const member of Object.values(args.group.doc().members)) {
      const memberAccess = Access.fromString(member.access);
      await this.access.grant({
        id: args.id,
        member: ContactCard.fromJson(member.contactCardJson),
        access: memberAccess.atLeast(args.access) ? args.access : memberAccess,
      });
    }
    args.group.change((d) => {
      if (!d.documents.some((doc) => doc.id === args.id)) {
        d.documents.push({ id: args.id, access: args.access.toString() });
      }
    });
  }

  /** Returns all members of the group. */
  async members(group: DocHandle<Group>): Promise<GroupMember[]> {
    return Object.entries(group.doc().members).map(([idHex, member]) => ({
      id: new Identifier(hexToUint8Array(idHex)),
      access: Access.fromString(member.access),
    }));
  }
}
