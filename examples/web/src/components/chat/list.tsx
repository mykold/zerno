import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useDocHandle, useDocuments } from "zerno-react"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import { MessageCircleIcon } from "lucide-react"

import { useAppContext } from "@/app-context"
import { useMessages } from "@/hooks/use-messages"
import { useNewMessageSound } from "@/hooks/use-message-sound"
import { useNewMessageTitle } from "@/hooks/use-new-message-title"
import { useMessageEditing } from "@/hooks/use-message-editing"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { ZernoChannel, ZernoMessageList } from "@/service"
import { buildTimelineEntries } from "./timeline"
import { ChatMessageEntry } from "./message"

const NEW_MESSAGE_SOUND_PATH = "/notification.mp3"

const VirtuosoList = forwardRef<
  HTMLDivElement,
  { style?: CSSProperties; children?: ReactNode }
>(({ style, children }, ref) => (
  <div ref={ref} style={style} className="px-6">
    {children}
  </div>
))

function VirtuosoTopSpacer() {
  return <div className="h-6" />
}

export interface ChannelMessageListProps {
  selectedChannel: ZernoChannel
}

export function ChannelMessageList({
  selectedChannel,
}: ChannelMessageListProps) {
  const { service } = useAppContext()

  const [myId] = useState(() => service.zerno.identity.id("string"))

  const messageListUrls = useMemo(() => {
    if (!selectedChannel?.messages) return []
    return Object.values(selectedChannel.messages)
  }, [selectedChannel.messages])
  const [messageLists] = useDocuments<ZernoMessageList>(messageListUrls, {
    suspense: false,
  })

  // Editing and deleting only ever touch our own message list
  const myMessageList = useDocHandle<ZernoMessageList>(
    selectedChannel.messages[myId],
    { suspense: false }
  )

  const messages = useMessages(messageLists)

  // TODO: Make this configurable
  useNewMessageSound(messages, myId, NEW_MESSAGE_SOUND_PATH)
  useNewMessageTitle(messages, myId)

  const entries = useMemo(
    () => buildTimelineEntries(messages, myId),
    [messages, myId]
  )

  const { editingId, startEditing, stopEditing, lastOwnMessageIdRef } =
    useMessageEditing()
  const lastOwnMessageId =
    entries.findLast((entry) => entry.isOwn)?.message.id ?? null
  useEffect(() => {
    lastOwnMessageIdRef.current = lastOwnMessageId
  }, [lastOwnMessageId, lastOwnMessageIdRef])

  const virtuosoRef = useRef<VirtuosoHandle>(null)
  useEffect(() => {
    if (!editingId) return
    const index = entries.findIndex((entry) => entry.message.id === editingId)
    if (index < 0) return
    virtuosoRef.current?.scrollIntoView({ index, behavior: "smooth" })
  }, [editingId, entries])

  if (messages.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon" className="size-12">
            <MessageCircleIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-xl">No messages yet</EmptyTitle>
          <EmptyDescription className="text-base">
            Start the conversation by sending your first message.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="scrollbar-none flex-1"
      data={entries}
      components={{ List: VirtuosoList, Header: VirtuosoTopSpacer }}
      followOutput="auto"
      initialTopMostItemIndex={entries.length - 1}
      computeItemKey={(_, entry) => entry.message.id}
      itemContent={(_, entry) => (
        <ChatMessageEntry
          {...entry}
          messageList={myMessageList}
          isEditing={editingId === entry.message.id}
          startEditing={startEditing}
          stopEditing={stopEditing}
        />
      )}
    />
  )
}
