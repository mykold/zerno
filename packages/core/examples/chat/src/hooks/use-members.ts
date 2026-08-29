import { useEffect, useState } from "react";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { Access } from "zerno-core";
import type { DocMember } from "zerno-core";
import { useZerno } from "zerno-react";

const MEMBERS_REFRESH_DEBOUNCE_MS = 300;

export function useMembers(groupId?: AutomergeUrl): DocMember[] | undefined {
  const zerno = useZerno();

  const [members, setMembers] = useState<DocMember[] | undefined>(undefined);

  useEffect(() => {
    if (!groupId) {
      setMembers(undefined);
      return;
    }
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setMembers(undefined);
    const fetchMembers = (): void => {
      zerno.access
        .membersWithAccess({ id: groupId, access: Access.read() })
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
