import { HashIcon, UsersIcon } from "lucide-react"
import { useMembers } from "zerno-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { identifierColor, shrinkIdentifier } from "@/utilities"
import type { ZernoChannel } from "@/service"
import { useMemo } from "react"

export interface ChannelHeaderProps {
  channel: ZernoChannel
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  const members = useMembers(channel.groupUrl)

  const sortedMembers = useMemo(
    () =>
      [...members].sort(
        (a, b) => b.access.level - a.access.level || a.id.localeCompare(b.id)
      ),
    [members]
  )

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 font-semibold">
      <div className="flex items-center gap-2">
        <HashIcon className="h-5 w-5 text-muted-foreground" />
        {channel.name}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="font-normal text-muted-foreground"
          >
            <UsersIcon />
            {members.length} {members.length === 1 ? "member" : "members"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="max-h-[min(24rem,var(--radix-popover-content-available-height))] w-72 p-1"
        >
          <ScrollArea className="max-h-[inherit]">
            {sortedMembers.map((member) => {
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5"
                >
                  <Avatar className="size-6">
                    <AvatarFallback
                      className="text-[10px] font-medium text-white"
                      style={{ backgroundColor: identifierColor(member.id) }}
                    >
                      {member.id.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-normal">
                    {shrinkIdentifier(member.id)}
                    {member.isSelf && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </span>
                  <Badge variant="default">
                    {member.access.toString().toLowerCase()}
                  </Badge>
                </div>
              )
            })}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </header>
  )
}
