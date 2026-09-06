import { useMemo, useSyncExternalStore } from "react";
import { useRepo } from "@automerge/react/slim";
import type { AnyDocumentId } from "@automerge/react/slim";

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
