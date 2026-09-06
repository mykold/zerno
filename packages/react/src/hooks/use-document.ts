import { useDocument as automergeUseDocument } from "@automerge/react/slim";
import type {
  AnyDocumentId,
  UseDocumentSynchronousParams,
} from "@automerge/react/slim";
import type { ChangeFn, ChangeOptions, Doc } from "@automerge/automerge/slim";

import { useDocumentProgress } from "./use-document-progress.js";
import { useRetryUnavailableDocs } from "./use-retry-unavailable-docs.js";

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
 * Subscribes to an Automerge document, re-rendering on every change.
 *
 * Use this for whole-document UI. If a component only reads one field,
 * prefer `useDocHandle` + `useDocSelector` so unrelated field changes
 * don't re-render it.
 *
 * @example
 * ```tsx
 * const [doc, changeDoc] = useDocument<Counter>(url);
 * if (!doc) return <Spinner />;
 * return <button onClick={() => changeDoc(d => d.count++)}>{doc.count}</button>;
 *
 * // or, to suspend instead of checking for `undefined`:
 * const [doc, changeDoc] = useDocument<Counter>(url, { suspense: true });
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
