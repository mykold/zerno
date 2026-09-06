import { useDocHandle as automergeUseDocHandle } from "@automerge/react/slim";
import type { AnyDocumentId } from "@automerge/react/slim";
import type { DocHandle } from "@automerge/automerge-repo/slim";

import { useRetryUnavailableDocs } from "./use-retry-unavailable-docs.js";

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
 * Returns a `DocHandle<T>` without subscribing the component to its changes.
 *
 * Pass this into mutation functions or services (`handle.change(...)`) where
 * you don't want every keystroke or remote edit to re-render the component.
 * Pair with `useDocSelector` when you also need to read a slice of it.
 *
 * @example
 * ```tsx
 * const handle = useDocHandle<TaskList>(url, { suspense: true });
 * const addTask = (title: string) =>
 *   handle.change((d) => d.tasks.push({ title }));
 * ```
 */
export function useDocHandle<T>(
  id?: AnyDocumentId,
  params?: UseDocHandleSuspendingParams | UseDocHandleSynchronousParams,
): DocHandle<T> | undefined {
  useRetryUnavailableDocs([id]);
  return automergeUseDocHandle<T>(
    id as AnyDocumentId,
    params as { suspense: false },
  ) as DocHandle<T> | undefined;
}
