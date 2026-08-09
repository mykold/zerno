import type { Repo } from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

import { DocumentService } from "./document.js";
import { AccessService } from "./access.js";
import { IdentityService } from "./identity.js";

export interface ZernoOptions {
  repo: Repo;
  hive: AutomergeRepoKeyhive;
}

export class Zerno {
  readonly repo: Repo;
  readonly hive: AutomergeRepoKeyhive;
  readonly documents: DocumentService;
  readonly access: AccessService;
  readonly identity: IdentityService;

  constructor(options: ZernoOptions) {
    this.repo = options.repo;
    this.hive = options.hive;
    this.documents = new DocumentService(options.repo, options.hive);
    this.access = new AccessService(options.hive);
    this.identity = new IdentityService(options.hive);
  }
}
