import { HashIcon } from "lucide-react"
import { useMembers } from "zerno-react"

import type { ZernoChannel } from "@/service"

export interface ChannelHeaderProps {
  channel: ZernoChannel
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  const members = useMembers(channel.groupUrl)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 font-semibold">
      <div className="flex items-center gap-2">
        <HashIcon className="h-5 w-5 text-muted-foreground" />
        {channel.name}
      </div>
      <div className="text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? "member" : "members"}
      </div>
    </header>
  )
}
