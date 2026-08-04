import type { PeerId } from "@automerge/automerge-repo";
import {
  uint8ArrayToHex,
  type AutomergeRepoKeyhive,
  type ContactCard,
} from "@automerge/automerge-repo-keyhive";

export interface IdentityInfo {
  id: string;
  peerId: PeerId;
  contactCard: ContactCard;
}

export class Identity {
  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  me(): IdentityInfo {
    return {
      id: uint8ArrayToHex(this.hive.active.individual.id.toBytes()),
      peerId: this.hive.active.peerId,
      contactCard: this.hive.active.contactCard,
    };
  }

  contactCard(): ContactCard {
    return this.hive.active.contactCard;
  }
}
