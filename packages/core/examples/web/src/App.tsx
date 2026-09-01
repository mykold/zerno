import { useDocument } from "zerno-react"

import Layout from "@/components/layout"
import { useSelectedGroupUrl } from "@/hooks/use-selected-group-url"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ChatHeader } from "@/components/chat/header"
import { ChatMessageList } from "@/components/chat/message-list"
import { ChatInput, ChatInputSkeleton } from "@/components/chat/input"
import type { ZernoGroup } from "@/service"
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
  const selectedGroupUrl = useSelectedGroupUrl()
  const [selectedGroup] = useDocument<ZernoGroup>(selectedGroupUrl, {
    suspense: false,
  })

  return (
    <Layout sidebar={<AppSidebar />}>
      {selectedGroupUrl && selectedGroup ? (
        <div className="flex h-screen w-full flex-col bg-background">
          <ChatHeader
            selectedGroupUrl={selectedGroupUrl}
            group={selectedGroup}
          />
          <ChatMessageList selectedGroup={selectedGroup} />
          <Suspense fallback={<ChatInputSkeleton />}>
            <ChatInput selectedGroupUrl={selectedGroupUrl} />
          </Suspense>
        </div>
      ) : (
        <Empty className="h-full w-full">
          <EmptyHeader className="max-w-md">
            <EmptyMedia variant="icon" className="size-12">
              <MessageCircleIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-xl">No group selected</EmptyTitle>
            <EmptyDescription className="text-base">
              Select a group from the sidebar to start messaging.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </Layout>
  )
}

export default App
