import type { Repo } from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

import { DocumentService } from "./document.js";
import { AccessService } from "./access.js";
import { IdentityService } from "./identity.js";
import { GroupService } from "./groups.js";

export interface ZernoOptions {
  repo: Repo;
  hive: AutomergeRepoKeyhive;
  /**
   * Periodically re-arms the subduction sync loop for every known document.
   *
   * Local commits are inserted into a document's sedimentree without any
   * broadcast, and per-tree batch-sync requests stop once both sides report
   * equal heads — so later local changes are never uploaded unless something
   * re-requests the tree. This interval keeps shared documents flowing.
   */
  resyncSubductionInterval?: number;
}

export class Zerno {
  public readonly repo: Repo;
  public readonly hive: AutomergeRepoKeyhive;

  public readonly documents: DocumentService;
  public readonly access: AccessService;
  public readonly identity: IdentityService;
  public readonly groups: GroupService;

  constructor({ repo, hive, resyncSubductionInterval }: ZernoOptions) {
    this.repo = repo;
    this.hive = hive;
    this.documents = new DocumentService(repo, hive);
    this.access = new AccessService(hive);
    this.identity = new IdentityService(hive);
    this.groups = new GroupService(hive);

    if (resyncSubductionInterval && resyncSubductionInterval > 0)
      this.documents.startResyncSubductionTimer(resyncSubductionInterval);
  }

  // TODO: Why is this here? Maybe should be moved into `.grant()`? I don't really know.
  // If not, then create methos `.grantMany()` and then call `hive.networkAdapter.syncKeyhive()`
  /** Forces an immediate outbound keyhive sync (capability grants, etc). */
  syncKeyhive(): void {
    this.hive.networkAdapter.syncKeyhive();
  }
}
