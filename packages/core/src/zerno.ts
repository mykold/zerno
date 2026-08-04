import type { Repo } from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

import { Access } from "./access.js";
import { Documents } from "./document.js";
import { Identity } from "./identity.js";

export interface ZernoOptions {
  repo: Repo;
  hive: AutomergeRepoKeyhive;
}

export class Zerno {
  readonly repo: Repo;
  readonly documents: Documents;
  readonly access: Access;
  readonly identity: Identity;

  constructor(options: ZernoOptions) {
    this.repo = options.repo;
    this.documents = new Documents(options.repo, options.hive);
    this.access = new Access(options.hive);
    this.identity = new Identity(options.hive);
  }
}
