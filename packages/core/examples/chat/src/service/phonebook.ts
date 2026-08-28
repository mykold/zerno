import { Access, uint8ArrayToHex } from "@automerge/automerge-repo-keyhive";
import { Identifier } from "@automerge/automerge-repo-keyhive";
import { ContactCard } from "@automerge/automerge-repo-keyhive";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import { Zerno } from "zerno-core";

import type { GroupService } from "./groups.js";

function key(identifier: Identifier | string): string {
  if (typeof identifier === "string") return identifier;
  return uint8ArrayToHex(identifier.toBytes());
}

export type ZernoPhonebook = Record<string, string>;

export class PhonebookService {
  constructor(private readonly zerno: Zerno) {}

  async find(
    id: AutomergeUrl,
    timeout: number = 60_000 /* ms */,
  ): Promise<DocHandle<ZernoPhonebook>> {
    const signal = AbortSignal.timeout(timeout);
    return await this.zerno.documents.find<ZernoPhonebook>(id, { signal });
  }

  async create(): Promise<DocHandle<ZernoPhonebook>> {
    const handle = await this.zerno.documents.create<ZernoPhonebook>({});

    /** TODO: Maybe should be moved outside? See {@link GroupService.grantGroup} */
    await this.zerno.access.grantPublicAccess({
      id: handle.url,
      access: Access.read(),
    });
    return handle;
  }

  /** Returns the contact card for the given identifier. Returns undefined if not found */
  async resolve(args: {
    phonebookId: AutomergeUrl;
    identifier: Identifier | string;
  }): Promise<ContactCard> {
    const handle = await this.find(args.phonebookId);
    const json = handle.doc()[key(args.identifier)] as string | undefined;
    if (!json)
      throw new Error(
        `Contact card not found for identifier: ${args.identifier}`,
      );
    return ContactCard.fromJson(json);
  }

  async add(args: {
    phonebookId: AutomergeUrl;
    contactCard: ContactCard;
  }): Promise<void> {
    const handle = await this.find(args.phonebookId);
    const json = args.contactCard.toJson();
    handle.change((d) => (d[key(args.contactCard.id)] = json));
  }

  async delete(args: {
    phonebookId: AutomergeUrl;
    identifier: Identifier | string;
  }): Promise<void> {
    const handle = await this.find(args.phonebookId);
    handle.change((d) => delete d[key(args.identifier)]);
  }
}
