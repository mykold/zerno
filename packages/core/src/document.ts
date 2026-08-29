import { interpretAsDocumentId } from "@automerge/automerge-repo";
import type {
  AbortOptions,
  AutomergeUrl,
  DocHandle,
  Repo,
  RepoFindOptions,
} from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

/** Upper bound for find() when the caller provides no signal. */
const DEFAULT_FIND_TIMEOUT_MS = 120_000;

export type DebugEventFn = (
  kind: string,
  data?: Record<string, unknown>,
) => void;

export class DocumentService {
  /** All document urls this instance has created or found. */
  readonly #urls = new Set<AutomergeUrl>();

  constructor(
    private readonly repo: Repo,
    private readonly hive: AutomergeRepoKeyhive,
    // TODO: Kinda ugly to pass this. Maybe we should just remove debug infrastructure.
    private readonly debug?: DebugEventFn,
  ) {}

  async create<T>(initialValue: T): Promise<DocHandle<T>> {
    const handle = await this.repo.create2<T>(initialValue);
    await this.hive.addSyncServerRelayToDoc(handle.url);
    this.#urls.add(handle.url);
    this.debug?.("doc-created", { url: handle.url });
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
    this.#urls.add(id);
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

  #timer: ReturnType<typeof setInterval> | null = null;

  /** Starts periodic {@link Repo.resyncSubduction} over all known documents. */
  startResyncSubductionTimer(intervalMs: number): void {
    if (this.#timer) throw new Error("Auto resync already started");

    this.#timer = setInterval(() => {
      for (const url of this.#urls) {
        try {
          this.repo.resyncSubduction(interpretAsDocumentId(url));
        } catch {
          // Document not attached yet so next tick retries
        }
      }
    }, intervalMs);
  }

  /** Stops periodic {@link Repo.resyncSubduction} */
  stopResyncSubductionTimer(): void {
    if (!this.#timer) throw new Error("Auto resync not started");
    clearInterval(this.#timer);
    this.#timer = null;
  }
}
