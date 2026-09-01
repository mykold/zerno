import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  useRepo,
  useDocument as automergeUseDocument,
  useDocuments as automergeUseDocuments,
  useDocHandle as automergeUseDocHandle,
  useDocHandles as automergeUseDocHandles,
} from "@automerge/react/slim";
import type {
  AnyDocumentId,
  UseDocumentSynchronousParams,
  UseDocumentsOptions,
} from "@automerge/react/slim";
import type { ChangeFn, ChangeOptions, Doc } from "@automerge/automerge/slim";
import type { DocHandle } from "@automerge/automerge-repo/slim";
import { Access } from "zerno-core";
import type { AutomergeUrl, DocMember } from "zerno-core";

import { useZerno } from "./ZernoProvider.js";

// MARK: useRetryUnavailableDocs

const RETRY_UNAVAILABLE_BASE_DELAY_MS = 1_000;
const RETRY_UNAVAILABLE_MAX_DELAY_MS = 10_000;

/**
 * Re-issues finds for documents whose query settled to "unavailable".
 *
 * A peer can learn about a document before its decryption keys arrive
 * (grants sync on a ~1s debounce), so a query can reject with "unavailable".
 * `Repo.find()` evicts such queries, so periodically forcing a re-render
 * which makes the wrapped hooks call `find()` again is enough for the
 * documents to appear once their keys land. The tick backs off from 1s to
 * a 10s cap so a permanently unavailable document does not churn.
 */
function useRetryUnavailableDocs(
  ids: readonly (AnyDocumentId | undefined)[],
): void {
  const repo = useRepo();
  const [, forceRender] = useState({});
  const idsKey = ids.map((id) => id?.toString() ?? "").join("|");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delayMs = RETRY_UNAVAILABLE_BASE_DELAY_MS;
    const tick = (): void => {
      let anyUnavailable = false;
      for (const id of idsKey.split("|")) {
        if (!id) continue;
        try {
          const progress = repo.findWithProgress(id as AnyDocumentId);
          if (progress.peek().state === "unavailable") anyUnavailable = true;
        } catch {
          // No query yet so nothing to retry.
        }
      }
      if (anyUnavailable) forceRender({});
      timer = setTimeout(tick, delayMs);
      delayMs = Math.min(delayMs * 2, RETRY_UNAVAILABLE_MAX_DELAY_MS);
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, idsKey]);
}

/**
 * Uses the repo to monitor the progress of a document.
 */
export function useDocumentProgress(id?: AnyDocumentId): void {
  const repo = useRepo();

  const query = useMemo(() => {
    if (!id) return null;
    return repo.findWithProgress(id);
  }, [repo, id]);

  useSyncExternalStore(
    (onChange) => {
      if (!query) return () => {};
      return query.subscribe(() => onChange());
    },
    () => (query ? query.peek().state : undefined),
  );
}

// MARK: useDocument

export type UseDocumentChangeFn<T> = (
  changeFn: ChangeFn<T>,
  options?: ChangeOptions<T>,
) => void;

export function useDocument<T>(
  id: AnyDocumentId,
  params: { suspense: true },
): [Doc<T>, UseDocumentChangeFn<T>];

export function useDocument<T>(
  id?: AnyDocumentId,
  params?: UseDocumentSynchronousParams,
): [Doc<T>, UseDocumentChangeFn<T>] | [undefined, () => void];

/**
 * Loads an Automerge document and automatically subscribes the component to its changes.
 *
 * @architecturalNote
 * Should be used for UI rendering. `useDocument` triggers a re-render of the component whenever
 * any part of the document changes.
 *
 * @example
 * ```tsx
 * function CounterWithoutSuspense({ url }: { url: AutomergeUrl }) {
 *   const [doc, changeDoc] = useDocument<MyType>(url);
 *   if (!doc) return <div>Loading counter...</div>;
 *   return <button onClick={() => changeDoc(d => d.count++)}>{doc.count}</button>;
 * }
 *
 * function CounterWithSuspense({ url }: { url: AutomergeUrl }) {
 *   const [doc, changeDoc] = useDocument<MyType>(url, { suspense: true });
 *   return <button onClick={() => changeDoc(d => d.count++)}>{doc.count}</button>;
 * }
 *
 * function App({ url }: { url: AutomergeUrl }) {
 *   return (
 *     <>
 *       <CounterWithoutSuspense url="{url}"/>
 *       <Suspense fallback="{<div">Loading counter...</div>}>
 *         <CounterWithSuspense url="{url}"/>
 *       </Suspense>
 *     </>
 *   );
 * }
 * ```
 */
export function useDocument<T>(
  id?: AnyDocumentId,
  params?: UseDocumentSynchronousParams | { suspense: true },
): [Doc<T>, UseDocumentChangeFn<T>] | [undefined, () => void] {
  useDocumentProgress(id);
  useRetryUnavailableDocs([id]);

  if (params?.suspense === true) {
    return automergeUseDocument<T>(id!, params);
  }

  return automergeUseDocument<T>(id, params);
}

// MARK: useDocuments

/**
 * Loads multiple Automerge documents simultaneously and subscribes to their updates.
 *
 * @architecturalNote
 * Useful for rendering lists of separate documents (e.g., group lists or task collections).
 *
 * @example
 * ```tsx
 * function GroupList({ urls }: { urls: AutomergeUrl[] }) {
 *   const groups = useDocuments<GroupType>(urls);
 *   return (
 *     <ul>
 *       {Array.from(groups.entries()).map(([url, group]) => (
 *         <li key={url}>{group?.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDocuments<T>(
  ids: AutomergeUrl[],
  options?: UseDocumentsOptions,
) {
  const repo = useRepo();
  const [, forceRender] = useState({});
  useRetryUnavailableDocs(ids);

  useEffect(() => {
    const subscriptions = ids.map((id) => {
      const query = repo.findWithProgress(id);
      return query.subscribe(() => forceRender({}));
    });

    return () => void subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [repo, ids]);

  return automergeUseDocuments<T>(ids, options);
}

// MARK: useDocHandle

export interface UseDocHandleSuspendingParams {
  suspense: true;
}

export interface UseDocHandleSynchronousParams {
  suspense?: false;
}

export function useDocHandle<T>(
  id: AnyDocumentId,
  params: UseDocHandleSuspendingParams,
): DocHandle<T>;

export function useDocHandle<T>(
  id?: AnyDocumentId,
  params?: UseDocHandleSynchronousParams,
): DocHandle<T> | undefined;

/**
 * Returns a `DocHandle<T>` for the given document-id without automatically triggering React re-renders on changes.
 *
 * @architecturalNote
 * Should be used for passing handles into domain services or actions where you want
 * to avoid unnecessary component re-renders during frequent mutations.
 *
 * @example
 * ```tsx
 * interface Task     { title: string; }
 * interface TaskList { tasks: Task[]; }
 *
 * function App({ service, url }: { service: Service; url: AutomergeUrl }) {
 *   const [title, setTitle] = useState<string>("");
 *   const handle = useDocHandle<TaskList>(url, { suspense: false });
 *   if (!handle) return <div>Loading...</div>;
 *   return (
 *     <>
 *       <ul>
 *         {handle.doc().tasks.map(task =>
 *           <li key={task.title}>{task.title}</li>
 *         )}
 *       </ul>
 *       <input value={title} onChange={e => setTitle(e.target.value)} />
 *       <button onClick={() => void service.appendTask({ handle, title })}>Add Task</button>
 *     </>
 *   );
 * }
 * ```
 */
export function useDocHandle<T>(
  id?: AnyDocumentId,
  params?: UseDocHandleSuspendingParams | UseDocHandleSynchronousParams,
): DocHandle<T> | undefined {
  useRetryUnavailableDocs([id]);
  return automergeUseDocHandle<T>(id as AnyDocumentId, params as any) as
    | DocHandle<T>
    | undefined;
}

// MARK: useDocHandles

export type DocHandleMap<T> = Map<AutomergeUrl, DocHandle<T> | undefined>;

export interface UseDocHandlesParams {
  suspense?: boolean;
}

/**
 * Loads multiple document handles at once.
 *
 * @architecturalNote
 * Returns a map of `DocHandle<T>` instances, allowing services or components to manage
 * batch operations over multiple handles.
 *
 * @example
 * ```tsx
 * function BatchManager({ urls }: { urls: AutomergeUrl[] }) {
 *   const handles = useDocHandles<MyType>(urls, { suspense: true });
 *   // handles is a Map<AutomergeUrl, DocHandle<MyType>>
 * }
 * ```
 */
export function useDocHandles<T>(
  ids: AutomergeUrl[],
  options?: UseDocHandlesParams,
): DocHandleMap<T> {
  useRetryUnavailableDocs(ids);
  return automergeUseDocHandles<T>(ids, options) as DocHandleMap<T>;
}

// MARK: useDocumentSelector

export function useDocumentSelector<T, R>(
  handle: DocHandle<T>,
  selector: (doc: T) => R,
): R;

export function useDocumentSelector<T, R>(
  handle: DocHandle<T> | undefined,
  selector: (doc: T) => R,
): R | undefined;

/**
 * Subscribes to a specific slice of a `DocHandle<T>`, re-rendering the component
 * ONLY when the selected data slice changes.
 *
 * @architecturalNote
 * Essential for performance optimization on large documents to prevent full-component re-renders.
 *
 * @example
 * ```tsx
 * interface Workspace {
 *   name: string;
 *   theme: string;
 *   heavyLogs: string[];
 * }
 *
 * function WorkspaceHeader({ url }: { url: AutomergeUrl }) {
 *   const handle = useDocHandle<Workspace>(url, { suspense: true });
 *
 *   const name = useDocumentSelector(handle, (doc) => doc.name);
 *
 *   return (
 *     <header>
 *       <h1>{name}</h1>
 *       <button onClick={() => handle.change(d => { d.name = "New Workspace Name"; })}>
 *         Rename
 *       </button>
 *     </header>
 *   );
 * }
 * ```
 */
export function useDocumentSelector<T, R>(
  handle: DocHandle<T> | undefined,
  selector: (doc: T) => R,
): R | undefined {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!handle) return () => {};
      handle.on("change", onStoreChange);
      return () => void handle.removeListener("change", onStoreChange);
    },
    () => {
      if (!handle) return undefined;
      const doc = handle.doc();
      if (!doc) return undefined;
      return selector(handle.doc());
    },
  );
}

// MARK: useMembers

const MEMBERS_REFRESH_DEBOUNCE_MS = 300;

export function useMembers(groupId: AutomergeUrl, access?: Access): DocMember[];
export function useMembers(
  groupId: AutomergeUrl | undefined,
  access?: Access,
): DocMember[] | undefined;

export function useMembers(
  groupId: AutomergeUrl | undefined,
  access?: Access,
): DocMember[] | undefined {
  const zerno = useZerno();

  const [members, setMembers] = useState<DocMember[]>([]);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setMembers([]);
    const fetchMembers = (): void => {
      zerno.access
        .membersWithAccess({
          id: groupId,
          access: access ?? Access.read(),
        })
        .then((result) => {
          if (isMounted) setMembers(result);
        })
        .catch((err) => {
          console.error("Failed to fetch Keyhive members:", err);
          if (isMounted) setMembers([]);
        });
    };
    // Hive emits `update` on every applied event, often in bursts; refetch
    // only after the burst goes quiet instead of once per event.
    const onUpdateListener = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isMounted) fetchMembers();
      }, MEMBERS_REFRESH_DEBOUNCE_MS);
    };
    fetchMembers();
    zerno.hive.emitter.on("update", onUpdateListener);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      zerno.hive.emitter.off("update", onUpdateListener);
    };
  }, [zerno, groupId]);

  return members;
}
