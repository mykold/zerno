import { Automerge } from "@automerge/automerge-repo/slim";
import {
  generateAutomergeUrl,
  interpretAsDocumentId,
  type AbortOptions,
  type AnyDocumentId,
  type DocHandle,
  type Repo,
  type RepoFindOptions,
} from "@automerge/automerge-repo";
import type { AutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive";

// NOTE: https://github.com/inkandswitch/keyhive-todo-app-demo/blob/1fa3e763e288048792cd0ecadff67f55648e75e8/src/phonebook.ts#L39-L48
const EMPTY_OBJECT_BYTES = (() => {
  let doc = Automerge.init<{ __seed?: true }>();
  doc = Automerge.change(doc, (d) => (d.__seed = true));
  doc = Automerge.change(doc, (d) => delete d.__seed);
  return Automerge.save(doc);
})();

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

    let doc: DocHandle<T>;
    if (!isEmptyObject) {
      doc = await this.repo.create2(initialValue);
    } else {
      // TODO: https://github.com/automerge/automerge-repo/issues/488
      // @ts-expect-error
      doc = await this.repo.create2({ __seed: true });
      // @ts-expect-error
      doc.change((d) => delete d.__seed);
    }

    await this.hive.addSyncServerRelayToDoc(doc.url);
    return doc;
  }

  /** Finds a document */
  async find<T>(
    id: AnyDocumentId,
    options?: RepoFindOptions & AbortOptions,
  ): Promise<DocHandle<T>> {
    return await this.repo.find<T>(id, options);
  }

  /** Deletes a document */
  async delete(id: AnyDocumentId) {
    this.repo.delete(id);
  }
}
