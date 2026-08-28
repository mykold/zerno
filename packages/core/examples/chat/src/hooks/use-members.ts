import { useEffect, useState } from "react";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { Access } from "zerno-core";
import type { DocMember } from "zerno-core";
import { useZerno } from "zerno-react";

export function useMembers(groupId?: AutomergeUrl): DocMember[] | undefined {
  const zerno = useZerno();

  const [members, setMembers] = useState<DocMember[] | undefined>(undefined);

  useEffect(() => {
    if (!groupId) {
      setMembers(undefined);
      return;
    }
    let isMounted = true;
    setMembers(undefined);
    const setMembersWithAccessListener = () => {
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
    setMembersWithAccessListener();
    zerno.hive.emitter.on("update", setMembersWithAccessListener);
    return () => {
      isMounted = false;
      zerno.hive.emitter.off("update", setMembersWithAccessListener);
    };
  }, [zerno, groupId]);

  return members;
}
