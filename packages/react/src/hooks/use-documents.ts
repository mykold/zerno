import { useDocuments as automergeUseDocuments } from "@automerge/react/slim";
import type { UseDocumentsOptions } from "@automerge/react/slim";
import type { AutomergeUrl } from "zerno-core";

import { useRetryUnavailableDocs } from "./use-retry-unavailable-docs.js";

/**
 * Batch version of `useDocument` — subscribes to a set of documents at
 * once, e.g. rendering a channel list from an array of channel urls.
 *
 * @example
 * ```tsx
 * const channels = useDocuments<Channel>(channelUrls); // Map<url, Doc<Channel>>
 * ```
 */
export function useDocuments<T>(
  ids: AutomergeUrl[],
  options?: UseDocumentsOptions,
) {
  useRetryUnavailableDocs(ids);

  return automergeUseDocuments<T>(ids, options);
}
