import type {
  AbortOptions,
  AutomergeUrl,
  DocHandle,
  Repo,
  RepoFindOptions,
} from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

/** Upper bound for .find(...) when the caller provides no signal. */
const DEFAULT_FIND_TIMEOUT_MS = 120_000;

export class DocumentService {
  constructor(
    private readonly repo: Repo,
    private readonly hive: AutomergeRepoKeyhive,
  ) {}

  async create<T>(initialValue: T): Promise<DocHandle<T>> {
    const handle = await this.repo.create2<T>(initialValue);
    await this.hive.addSyncServerRelayToDoc(handle.url);
    return handle;
  }

  /**
   * Finds a document, retrying while it is unavailable (see
   * {@link RepoFindOptions.unavailableRetryMs}).
   */
  async find<T>(
    id: AutomergeUrl,
    options?: RepoFindOptions & AbortOptions,
  ): Promise<DocHandle<T>> {
    return await this.repo.find<T>(id, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(DEFAULT_FIND_TIMEOUT_MS),
      unavailableRetryMs:
        options?.unavailableRetryMs ?? DEFAULT_FIND_TIMEOUT_MS,
    });
  }

  async delete(id: AutomergeUrl) {
    this.repo.delete(id);
  }
}
