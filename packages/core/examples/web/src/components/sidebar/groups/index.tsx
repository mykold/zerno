import { useNavigate } from "react-router"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { toast } from "sonner"

import { SidebarMenu, SidebarGroup } from "@/components/ui/sidebar"
import { useAppContext } from "@/app-context"
import { useSelectedGroupUrl } from "@/hooks/use-selected-group-url"
import { Group } from "./group"

export interface GroupsProps {
  urls: AutomergeUrl[]
}

export function Groups({ urls }: GroupsProps) {
  const navigate = useNavigate()

  const { workspace, service } = useAppContext()
  const selectedGroupUrl = useSelectedGroupUrl()

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          {urls.map((url) => {
            const onGroupSelect = () => navigate(`/groups/${url}`)
            const onGroupCopyUrl = () => {
              navigator.clipboard.writeText(url)
              toast.success("Copied to clipboard")
            }
            const onGroupClose = async () => {
              await service.workspaces.closeGroup({
                workspace,
                groupId: url,
              })
              if (selectedGroupUrl === url) navigate("/")
            }

            return (
              <Group
                key={url}
                url={url}
                isSelected={selectedGroupUrl === url}
                onGroupSelect={onGroupSelect}
                onGroupCopyUrl={onGroupCopyUrl}
                onGroupClose={onGroupClose}
              />
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
