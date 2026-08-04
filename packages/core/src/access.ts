import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  Access as KeyhiveAccess,
  Identifier,
  uint8ArrayToHex,
  type AutomergeRepoKeyhive,
  type ContactCard,
  type DocMember,
} from "@automerge/automerge-repo-keyhive";

export { KeyhiveAccess };

export class Access {
  constructor(private readonly hive: AutomergeRepoKeyhive) {}

  async grant(args: {
    document: AutomergeUrl;
    contactCard: ContactCard;
    access: KeyhiveAccess;
  }): Promise<void> {
    await this.hive.addMemberToDoc(
      args.document,
      args.contactCard,
      args.access,
    );
  }

  async revoke(args: {
    document: AutomergeUrl;
    member: Identifier | string;
  }): Promise<void> {
    await this.hive.revokeMemberFromDoc(args.document, args.member);
  }

  async members(document: AutomergeUrl): Promise<DocMember[]> {
    return this.hive.listMembers(document);
  }

  async myAccess(document: AutomergeUrl): Promise<KeyhiveAccess | undefined> {
    const id = this.hive.active.individual.id;
    return this.hive.bestAccessForDoc(id, document);
  }

  async hasAtLeast(args: {
    document: AutomergeUrl;
    level: KeyhiveAccess;
  }): Promise<boolean> {
    const id = this.hive.active.individual.id;
    const access = await this.hive.bestAccessForDoc(id, args.document);
    return access?.atLeast(args.level) ?? false;
  }

  async makePublic(args: {
    document: AutomergeUrl;
    level: KeyhiveAccess;
  }): Promise<void> {
    await this.hive.setPublicAccess(args.document, args.level);
  }

  async makePrivate(document: AutomergeUrl): Promise<void> {
    // NOTE: This code is commented because LLM written this.
    //       But i found way how not to make useless conversions.
    // ```
    // const publicId = Identifier.publicId().toBytes();
    // await this.hive.revokeMemberFromDoc(document, uint8ArrayToHex(publicId));
    // ```
    await this.hive.revokeMemberFromDoc(document, Identifier.publicId());
  }
}
