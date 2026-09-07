import { useKeyhiveUpdates } from "@automerge/keyhive-react";
import type { Access, AutomergeUrl } from "zerno-core";

import { useZerno } from "../ZernoProvider.js";
import { useAsyncEffect } from "./use-async-effect.js";

/**
 * The current user's access level to a document — gate UI on it, e.g.
 * hiding the message input when you only have read access.
 *
 * @example
 * ```tsx
 * const access = useAccess(channel.url);
 * if (!access?.atLeast(Access.edit())) return null;
 * ```
 */
export function useAccess(id: AutomergeUrl | undefined): Access | undefined {
  const zerno = useZerno();
  const version = useKeyhiveUpdates(zerno.hive);

  return useAsyncEffect<Access | undefined>(
    () => {
      if (!id) return undefined;
      return zerno.access
        .getAccess({ id, member: zerno.identity.id() })
        .catch((err) => {
          console.error("Failed to fetch Keyhive access:", err);
          throw err;
        });
    },
    undefined,
    [version, id, zerno],
  );
}
