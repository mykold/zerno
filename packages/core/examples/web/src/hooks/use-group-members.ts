import { useEffect, useState } from "react"
import { Access } from "zerno-core"
import type { GroupMember } from "zerno-core"

import { useAppContext } from "@/app-context"

const MEMBERS_REFRESH_DEBOUNCE_MS = 2_000 /* ms */

export function useGroupMembers(groupId: string | undefined): GroupMember[] {
  const { service } = useAppContext()

  const [members, setMembers] = useState<GroupMember[]>([])

  useEffect(() => {
    let isMounted = true
    let timer: ReturnType<typeof setTimeout> | undefined

    const fetchMembers = (): void => {
      Promise.resolve(groupId)
        .then(async (id) => {
          if (!id) return []
          const group = await service.zerno.groups.find(id)
          const members = await service.zerno.groups.members(group)
          // Relay-level entries (the sync server) are infrastructure, not members
          return members.filter((member) =>
            member.access.atLeast(Access.read())
          )
        })
        .then((members) => {
          if (isMounted) setMembers(members)
        })
        .catch(() => {
          if (isMounted) setMembers([])
        })
    }

    // Hive emits `update` on every applied event, often in bursts; refetch
    // only after the burst goes quiet instead of once per event.
    const onUpdateListener = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (isMounted) fetchMembers()
      }, MEMBERS_REFRESH_DEBOUNCE_MS)
    }

    fetchMembers()
    service.zerno.hive.emitter.on("update", onUpdateListener)

    return () => {
      isMounted = false
      clearTimeout(timer)
      service.zerno.hive.emitter.off("update", onUpdateListener)
    }
  }, [service, groupId])

  return members
}
