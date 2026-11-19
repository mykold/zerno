import { useKeyhiveUpdates } from "@automerge/keyhive-react";
import { Power } from "zerno-core";
import type { AutomergeUrl, DocMember } from "zerno-core";

import { useZerno } from "../ZernoProvider.js";
import { useAsyncEffect } from "./use-async-effect.js";

/**
 * Lists everyone with at least `power` on a document, e.g. rendering a
 * member list or a "3 members" count in a channel header.
 *
 * @example
 * ```tsx
 * const members = useMembers(channel.url, Power.edit());
 * ```
 */
export function useMembers(
  id: AutomergeUrl | undefined,
  power: Power = Power.read(),
): DocMember[] {
  const zerno = useZerno();
  const version = useKeyhiveUpdates(zerno.hive);

  return useAsyncEffect<DocMember[]>(
    () => {
      if (!id) return undefined;
      return zerno.power.membersWithPower({ id, power }).catch((err) => {
        console.error("Failed to fetch Keyhive members:", err);
        throw err;
      });
    },
    [],
    [version, id, zerno],
  );
}
