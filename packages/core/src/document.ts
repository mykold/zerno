import type {
  AbortOptions,
  AutomergeUrl,
  DocHandle,
  Repo,
  RepoFindOptions,
} from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

export interface CreateOptions {
  grantSyncServerRelay?: boolean;
}

export class Documents {
  constructor(
    private readonly repo: Repo,
    private readonly hive: AutomergeRepoKeyhive,
  ) {}

  async create<T>(data: T, options?: CreateOptions): Promise<DocHandle<T>> {
    const doc = await this.repo.create2(data);
    if (options?.grantSyncServerRelay !== false) {
      await this.hive.addSyncServerRelayToDoc(doc.url);
    }
    return doc;
  }

  async find<T>(
    url: AutomergeUrl,
    options?: RepoFindOptions & AbortOptions,
  ): Promise<DocHandle<T>> {
    return await this.repo.find<T>(url, options);
  }
}
