import { useDocument } from "zerno-react"

import Layout from "@/components/layout"
import { useSelectedChannelUrl } from "@/hooks/use-selected-channel-url"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ChannelHeader } from "@/components/channel/header"
import { ChannelMessageList } from "@/components/channel/message-list"
import { ChannelInput, ChannelInputSkeleton } from "@/components/channel/input"
import type { ZernoChannel } from "@/service"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { MessageCircleIcon } from "lucide-react"
import { Suspense } from "react"

export function App() {
  const selectedChannelUrl = useSelectedChannelUrl()
  const [selectedChannel] = useDocument<ZernoChannel>(selectedChannelUrl, {
    suspense: false,
  })

  return (
    <Layout sidebar={<AppSidebar />}>
      {selectedChannelUrl && selectedChannel ? (
        <div className="flex h-screen w-full flex-col bg-background">
          <ChannelHeader channel={selectedChannel} />
          <ChannelMessageList selectedChannel={selectedChannel} />
          <Suspense fallback={<ChannelInputSkeleton />}>
            <ChannelInput selectedChannelUrl={selectedChannelUrl} />
          </Suspense>
        </div>
      ) : (
        <Empty className="h-full w-full">
          <EmptyHeader className="max-w-md">
            <EmptyMedia variant="icon" className="size-12">
              <MessageCircleIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-xl">No channel selected</EmptyTitle>
            <EmptyDescription className="text-base">
              Select a channel from the sidebar to start messaging.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </Layout>
  )
}

export default App
