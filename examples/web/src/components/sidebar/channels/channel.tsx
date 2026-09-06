import { useState } from "react"
import {
  TrashIcon,
  EditIcon,
  MoreHorizontalIcon,
  CopyIcon,
  ShareIcon,
} from "lucide-react"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { useDocument } from "zerno-react"

import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ZernoChannel } from "@/service"
import { EditChannelSheet } from "./edit-channel-sheet"
import { GrantChannelSheet } from "./grant-channel-sheet"
import { Separator } from "@/components/ui/separator"

export interface ChannelProps {
  url: AutomergeUrl
  isSelected: boolean
  onChannelSelect: () => void
  onChannelCopyUrl: () => void
  onChannelClose: () => void
}

export function Channel({
  url,
  isSelected,
  onChannelSelect,
  onChannelCopyUrl,
  onChannelClose,
}: ChannelProps) {
  const [channel] = useDocument<ZernoChannel>(url, { suspense: true })

  const [isChannelGranting, setIsChannelGranting] = useState(false)
  const [isChannelEditing, setIsChannelEditing] = useState(false)

  return (
    <>
      <SidebarMenuItem className="group/item">
        <SidebarMenuButton
          isActive={isSelected}
          className="group-hover/item:bg-sidebar-accent group-hover/item:text-sidebar-accent-foreground group-has-data-[state=open]/item:bg-sidebar-accent group-has-data-[state=open]/item:text-sidebar-accent-foreground"
          onClick={onChannelSelect}
        >
          {channel.name}
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-transparent focus:outline-none focus-visible:ring-0 data-[state=open]:opacity-100">
              <MoreHorizontalIcon />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-50 p-2">
            <DropdownMenuItem onClick={onChannelCopyUrl}>
              <CopyIcon />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsChannelGranting(true)}
              className="text-blue-400"
            >
              <ShareIcon className="text-blue-400" />
              Grant access
            </DropdownMenuItem>
            <Separator className="mt-2 mb-2" />
            <DropdownMenuItem onClick={() => setIsChannelEditing(true)}>
              <EditIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onChannelClose}
              className="text-destructive"
            >
              <TrashIcon className="text-destructive" />
              Close
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <GrantChannelSheet
        url={url}
        open={isChannelGranting}
        setOpen={setIsChannelGranting}
      />
      <EditChannelSheet
        url={url}
        open={isChannelEditing}
        setOpen={setIsChannelEditing}
      />
    </>
  )
}
