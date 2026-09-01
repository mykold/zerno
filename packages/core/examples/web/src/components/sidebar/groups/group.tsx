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
import type { ZernoGroup } from "@/service"
import { EditGroupSheet } from "./edit-group-sheet"
import { GrantGroupSheet } from "./grant-group-sheet"
import { Separator } from "@/components/ui/separator"

export interface GroupProps {
  url: AutomergeUrl
  isSelected: boolean
  onGroupSelect: () => void
  onGroupCopyUrl: () => void
  onGroupClose: () => void
}

export function Group({
  url,
  isSelected,
  onGroupSelect,
  onGroupCopyUrl,
  onGroupClose,
}: GroupProps) {
  const [group] = useDocument<ZernoGroup>(url, { suspense: true })

  const [isGroupGranting, setIsGroupGranting] = useState(false)
  const [isGroupEditing, setIsGroupEditing] = useState(false)

  return (
    <>
      <SidebarMenuItem className="group/item">
        <SidebarMenuButton
          isActive={isSelected}
          className="group-hover/item:bg-sidebar-accent group-hover/item:text-sidebar-accent-foreground group-has-data-[state=open]/item:bg-sidebar-accent group-has-data-[state=open]/item:text-sidebar-accent-foreground"
          onClick={onGroupSelect}
        >
          {group.name}
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-transparent focus:outline-none focus-visible:ring-0 data-[state=open]:opacity-100">
              <MoreHorizontalIcon />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-50 p-2">
            <DropdownMenuItem onClick={onGroupCopyUrl}>
              <CopyIcon />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsGroupGranting(true)}
              className="text-blue-400"
            >
              <ShareIcon className="text-blue-400" />
              Grant access
            </DropdownMenuItem>
            <Separator className="mt-2 mb-2" />
            <DropdownMenuItem onClick={() => setIsGroupEditing(true)}>
              <EditIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onGroupClose}
              className="text-destructive"
            >
              <TrashIcon className="text-destructive" />
              Close
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <GrantGroupSheet
        url={url}
        open={isGroupGranting}
        setOpen={setIsGroupGranting}
      />
      <EditGroupSheet
        url={url}
        open={isGroupEditing}
        setOpen={setIsGroupEditing}
      />
    </>
  )
}
