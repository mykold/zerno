import type { Repo } from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

import { DocumentService } from "./document.js";
import type { DebugEventFn } from "./document.js";
import { AccessService } from "./access.js";
import { IdentityService } from "./identity.js";

export interface ZernoOptions {
  repo: Repo;
  hive: AutomergeRepoKeyhive;
  /** Optional structured debug-event sink (file logging, diagnostics). */
  onDebugEvent?: DebugEventFn;
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
  readonly repo: Repo;
  readonly hive: AutomergeRepoKeyhive;
  readonly documents: DocumentService;
  readonly access: AccessService;
  readonly identity: IdentityService;
  readonly debug?: DebugEventFn;

  constructor({
    repo,
    hive,
    onDebugEvent,
    resyncSubductionInterval,
  }: ZernoOptions) {
    this.repo = repo;
    this.hive = hive;
    this.debug = onDebugEvent;
    this.documents = new DocumentService(repo, hive, onDebugEvent);
    this.access = new AccessService(repo, hive);
    this.identity = new IdentityService(hive);

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
