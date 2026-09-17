import { useNavigate } from "react-router"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { toast } from "sonner"

import {
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
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
        <SidebarGroupLabel>Channels</SidebarGroupLabel>
        {urls.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No channels yet. Create or open one above.
          </p>
        )}
        <SidebarMenu>
          {urls.map((url) => {
            const onChannelSelect = () => navigate(`/channels/${url}`)
            const onChannelCopyUrl = () => {
              navigator.clipboard.writeText(url)
              toast.success("Channel URL copied to clipboard")
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
