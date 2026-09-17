import { useDocument } from "zerno-react"

import Layout from "@/components/layout"
import { useSelectedChannelUrl } from "@/hooks/use-selected-channel-url"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ChannelHeader } from "@/components/channel/header"
import {
  ChannelMessageList,
  ChannelMessageListSkeleton,
} from "@/components/chat/list"
import { ChannelInput, ChannelInputSkeleton } from "@/components/channel/input"
import { MessageEditingProvider } from "@/hooks/use-message-editing"
import type { ZernoChannel } from "@/service"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { MessageCircleIcon } from "lucide-react"
import { Suspense } from "react"

function NoChannelSelected() {
  return (
    <Empty className="h-dvh w-full max-md:hidden">
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon" className="size-10">
          <MessageCircleIcon className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-lg">No channel selected</EmptyTitle>
        <EmptyDescription className="text-sm">
          Select a channel from the sidebar to start messaging.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ChannelSkeleton() {
  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center border-b px-3 md:px-6">
        <SidebarTrigger className="md:hidden" />
      </div>
      <ChannelMessageListSkeleton />
      <ChannelInputSkeleton />
    </div>
  )
}

export function App() {
  const selectedChannelUrl = useSelectedChannelUrl()
  const [selectedChannel] = useDocument<ZernoChannel>(selectedChannelUrl, {
    suspense: false,
  })

  return (
    <Layout sidebar={<AppSidebar />}>
      {!selectedChannelUrl ? (
        <NoChannelSelected />
      ) : !selectedChannel ? (
        <ChannelSkeleton />
      ) : (
        <div className="flex h-dvh w-full flex-col bg-background">
          <ChannelHeader channel={selectedChannel} />
          {/* Keyed so switching channels never leaves an editor open */}
          <MessageEditingProvider key={selectedChannelUrl}>
            <ChannelMessageList selectedChannel={selectedChannel} />
            <Suspense fallback={<ChannelInputSkeleton />}>
              <ChannelInput selectedChannelUrl={selectedChannelUrl} />
            </Suspense>
          </MessageEditingProvider>
        </div>
      )}
    </Layout>
  )
}

export default App
