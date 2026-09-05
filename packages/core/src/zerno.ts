import type { Repo } from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

import { DocumentService } from "./document.js";
import { AccessService } from "./access.js";
import { IdentityService } from "./identity.js";
import { GroupService } from "./groups.js";

export interface ZernoOptions {
  repo: Repo;
  hive: AutomergeRepoKeyhive;
}

export class Zerno {
  public readonly repo: Repo;
  public readonly hive: AutomergeRepoKeyhive;

  public readonly documents: DocumentService;
  public readonly access: AccessService;
  public readonly identity: IdentityService;
  public readonly groups: GroupService;

  constructor({ repo, hive }: ZernoOptions) {
    this.repo = repo;
    this.hive = hive;
    this.documents = new DocumentService(repo, hive);
    this.access = new AccessService(hive);
    this.identity = new IdentityService(hive);
    this.groups = new GroupService(this.documents, this.access);
  }

  // TODO: Why is this here? Maybe should be moved into `.grant()`? I don't really know.
  // If not, then create methos `.grantMany()` and then call `hive.networkAdapter.syncKeyhive()`
  /** Forces an immediate outbound keyhive sync (capability grants, etc). */
  syncKeyhive(): void {
    this.hive.networkAdapter.syncKeyhive();
  }
}
