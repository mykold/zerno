import type { Identifier, ContactCard } from "@automerge/automerge-repo-keyhive";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive/dist/utilities.js";

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
        return uint8ArrayToHex(contactCard.toBytes());
    }
  }
}
