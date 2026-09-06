import { useDocHandles as automergeUseDocHandles } from "@automerge/react/slim";
import type { DocHandle } from "@automerge/automerge-repo/slim";
import type { AutomergeUrl } from "zerno-core";

import { useRetryUnavailableDocs } from "./use-retry-unavailable-docs.js";

export type DocHandleMap<T> = Map<AutomergeUrl, DocHandle<T> | undefined>;

export interface UseDocHandlesParams {
  suspense?: boolean;
}

/**
 * Batch version of `useDocHandle` — for services that mutate several
 * documents together, e.g. archiving every channel in a workspace.
 *
 * @example
 * ```tsx
 * const handles = useDocHandles<Channel>(channelUrls, { suspense: true });
 * handles.forEach((h) => h?.change((d) => { d.archived = true; }));
 * ```
 */
export function useDocHandles<T>(
  ids: AutomergeUrl[],
  options?: UseDocHandlesParams,
): DocHandleMap<T> {
  useRetryUnavailableDocs(ids);
  return automergeUseDocHandles<T>(ids, options) as DocHandleMap<T>;
}
