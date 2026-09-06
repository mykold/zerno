import { useNavigate } from "react-router"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { toast } from "sonner"

import { SidebarMenu, SidebarGroup } from "@/components/ui/sidebar"
import { useAppContext } from "@/app-context"
import { useSelectedChannelUrl } from "@/hooks/use-selected-channel-url"
import { Channel } from "./channel"

export interface ChannelsProps {
  urls: AutomergeUrl[]
}

export function Channels({ urls }: ChannelsProps) {
  const navigate = useNavigate()

  const { workspace, service } = useAppContext()
  const selectedChannelUrl = useSelectedChannelUrl()

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          {urls.map((url) => {
            const onChannelSelect = () => navigate(`/channels/${url}`)
            const onChannelCopyUrl = () => {
              navigator.clipboard.writeText(url)
              toast.success("Copied to clipboard")
            }
            const onChannelClose = async () => {
              await service.workspaces.closeChannel({
                workspace,
                channelId: url,
              })
              if (selectedChannelUrl === url) navigate("/")
            }

            return (
              <Channel
                key={url}
                url={url}
                isSelected={selectedChannelUrl === url}
                onChannelSelect={onChannelSelect}
                onChannelCopyUrl={onChannelCopyUrl}
                onChannelClose={onChannelClose}
              />
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
