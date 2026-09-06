import { useEffect, useState } from "react";
import { useRepo } from "@automerge/react/slim";
import type { AnyDocumentId } from "@automerge/react/slim";

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
export function useRetryUnavailableDocs(
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
