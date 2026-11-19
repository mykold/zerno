import { useKeyhiveUpdates } from "@automerge/keyhive-react";
import type { Power, AutomergeUrl } from "zerno-core";

import { useZerno } from "../ZernoProvider.js";
import { useAsyncEffect } from "./use-async-effect.js";

/**
 * The current user's power over a document — gate UI on it, e.g.
 * hiding the message input when you only have read power.
 *
 * @example
 * ```tsx
 * const power = usePower(channel.url);
 * if (!power?.atLeast(Power.edit())) return null;
 * ```
 */
export function usePower(id: AutomergeUrl | undefined): Power | undefined {
  const zerno = useZerno();
  const version = useKeyhiveUpdates(zerno.hive);

  return useAsyncEffect<Power | undefined>(
    () => {
      if (!id) return undefined;
      return zerno.power
        .getPower({ id, member: zerno.identity.id() })
        .catch((err) => {
          console.error("Failed to fetch Keyhive power:", err);
          throw err;
        });
    },
    undefined,
    [version, id, zerno],
  );
}
