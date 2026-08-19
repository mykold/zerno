import type {
  AbortOptions,
  AutomergeUrl,
  DocHandle,
  Repo,
  RepoFindOptions,
} from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

export class DocumentService {
  constructor(
    private readonly repo: Repo,
    private readonly hive: AutomergeRepoKeyhive,
  ) {}

  /** Creates a new document */
  async create<T>(initialValue: T): Promise<DocHandle<T>> {
    const isEmptyObject =
      typeof initialValue === "object" &&
      initialValue !== null &&
      !Array.isArray(initialValue) &&
      Object.keys(initialValue).length === 0;

    let handle: DocHandle<T>;
    if (!isEmptyObject) {
      handle = await this.repo.create2(initialValue);
    } else {
      // TODO: https://github.com/automerge/automerge-repo/issues/488
      // TODO: https://github.com/inkandswitch/keyhive-todo-app-demo/blob/1fa3e763e288048792cd0ecadff67f55648e75e8/src/phonebook.ts#L39-L48
      // @ts-expect-error
      handle = await this.repo.create2({ __seed: true });
      // @ts-expect-error
      handle.change((d) => delete d.__seed);
    }

    await this.hive.addSyncServerRelayToDoc(handle.url);
    return handle;
  }

  /** Finds a document */
  async find<T>(
    id: AutomergeUrl,
    options?: RepoFindOptions & AbortOptions,
  ): Promise<DocHandle<T>> {
    return await this.repo.find<T>(id, options);
  }

  /** Deletes a document */
  async delete(id: AutomergeUrl) {
    this.repo.delete(id);
  }
}
