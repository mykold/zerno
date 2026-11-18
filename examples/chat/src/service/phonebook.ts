import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive";
import { Identifier } from "@automerge/automerge-repo-keyhive";
import { ContactCard } from "@automerge/automerge-repo-keyhive";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import { Zerno } from "zerno-core";

function key(identifier: Identifier | string): string {
  if (typeof identifier === "string") return identifier;
  return uint8ArrayToHex(identifier.toBytes());
}

export type ZernoPhonebook = Record<string, Uint8Array>;

export class PhonebookService {
  private readonly zerno: Zerno;

  constructor(zerno: Zerno) {
    this.zerno = zerno;
  }

  async find(
    id: AutomergeUrl,
    timeout: number = 60_000 /* ms */,
  ): Promise<DocHandle<ZernoPhonebook>> {
    const signal = AbortSignal.timeout(timeout);
    return await this.zerno.documents.find<ZernoPhonebook>(id, { signal });
  }

  async create(): Promise<DocHandle<ZernoPhonebook>> {
    return await this.zerno.documents.create<ZernoPhonebook>({});
  }

  /** Returns the contact card for the given identifier. Returns undefined if not found */
  async resolve(args: {
    phonebookId: AutomergeUrl;
    identifier: Identifier | string;
  }): Promise<ContactCard> {
    const handle = await this.find(args.phonebookId);
    const bytes = handle.doc()[key(args.identifier)] as Uint8Array | undefined;
    if (!bytes)
      throw new Error(
        `Contact card not found for identifier: ${args.identifier}`,
      );
    return ContactCard.fromBytes(bytes);
  }

  async add(args: {
    phonebookId: AutomergeUrl;
    contactCard: ContactCard;
  }): Promise<void> {
    const handle = await this.find(args.phonebookId);
    const bytes = args.contactCard.toBytes();
    handle.change((d) => (d[key(args.contactCard.id)] = bytes));
  }

  async delete(args: {
    phonebookId: AutomergeUrl;
    identifier: Identifier | string;
  }): Promise<void> {
    const handle = await this.find(args.phonebookId);
    handle.change((d) => delete d[key(args.identifier)]);
  }
}
