import { Identifier, ContactCard } from "@automerge/automerge-repo-keyhive";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive/dist/utilities.js";

/** Encodes a contact card as a compact base64 string */
export function encodeContactCard(card: ContactCard): string {
  const bytes: number[] = [];

  const encode = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const offset = bytes.length;
      for (const byte of value) bytes.push(byte);
      return [1, value.length, offset];
    }
    if (value === null || typeof value !== "object") return value;
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) result[key] = encode(val);
    return result;
  };

  // TODO: Use `.toBytes()` when available
  const meta = new TextEncoder().encode(
    JSON.stringify(encode(JSON.parse(card.toJson()))),
  );
  const encoded = new Uint8Array(4 + meta.length + bytes.length);
  new DataView(encoded.buffer).setUint32(0, meta.length);
  encoded.set(meta, 4);
  encoded.set(bytes, 4 + meta.length);

  let binary = "";
  for (const byte of encoded) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Decodes a base64 contact card encoded by {@link encodeContactCard} */
export function decodeContactCard(value: string): ContactCard {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  const metaLength = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(
    0,
  );
  const meta: unknown = JSON.parse(
    new TextDecoder().decode(bytes.subarray(4, 4 + metaLength)),
  );
  const raw = bytes.subarray(4 + metaLength);

  const decode = (value: unknown): unknown => {
    if (Array.isArray(value) && value[0] === 1) {
      return Array.from(raw.subarray(value[2], value[2] + value[1]));
    }
    if (value === null || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) record[key] = decode(record[key]);
    return record;
  };

  // TODO: Use `.fromBytes()` when available
  return ContactCard.fromJson(JSON.stringify(decode(meta)));
}

export class IdentityService {
  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  id(): Identifier;
  id(repr: "object"): Identifier;
  id(repr: "bytes"): Uint8Array;
  id(repr: "string"): string;

  id(
    repr: "object" | "bytes" | "string" = "object",
  ): Identifier | string | Uint8Array {
    const id = this.hive.active.individual.id;
    switch (repr) {
      case "object":
        return id;
      case "bytes":
        return id.toBytes();
      case "string":
        return uint8ArrayToHex(id.toBytes());
    }
  }

  contactCard(): ContactCard;
  contactCard(repr: "object"): ContactCard;
  contactCard(repr: "string"): string;

  contactCard(repr: "object" | "string" = "object"): ContactCard | string {
    const contactCard = this.hive.active.contactCard;
    switch (repr) {
      case "object":
        return contactCard;
      case "string":
        return encodeContactCard(contactCard);
    }
  }
}
