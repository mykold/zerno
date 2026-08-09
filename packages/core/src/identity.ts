import type { PeerId } from "@automerge/automerge-repo";
import {
  Identifier,
  uint8ArrayToHex,
  ContactCard,
  type AutomergeRepoKeyhive,
} from "@automerge/automerge-repo-keyhive";

/** Encodes a contact card as UTF-8 JSON in base64 */
export function encodeContactCard(card: ContactCard): string {
  // TODO: Use `.toBytes()` when available
  const bytes = new TextEncoder().encode(card.toJson());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Decodes a base64-encoded UTF-8 contact card */
export function decodeContactCard(value: string): ContactCard {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  // TODO: Use `.fromBytes()` when available
  return ContactCard.fromJson(new TextDecoder().decode(bytes));
}

export interface Identity {
  id: Identifier;
  peerId: PeerId;
  contactCard: ContactCard;
}

export class IdentityService {
  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  /** Returns your identity */
  me(): Identity {
    const active = this.hive.active;
    return {
      id: active.individual.id,
      peerId: active.peerId,
      contactCard: active.contactCard,
    };
  }
}
