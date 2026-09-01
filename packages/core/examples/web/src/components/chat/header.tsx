import { HashIcon } from "lucide-react"
import { useMembers } from "zerno-react"
import type { AutomergeUrl } from "@automerge/automerge-repo"

import type { ZernoGroup } from "@/service"

export interface ChatHeaderProps {
  selectedGroupUrl: AutomergeUrl
  group: ZernoGroup
}

export function ChatHeader({ selectedGroupUrl, group }: ChatHeaderProps) {
  const members = useMembers(selectedGroupUrl)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 font-semibold">
      <div className="flex items-center gap-2">
        <HashIcon className="h-5 w-5 text-muted-foreground" />
        {group.name}
      </div>
      <div className="text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? "member" : "members"}
      </div>
    </header>
  )
}
