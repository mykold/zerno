import {
  forwardRef,
  useCallback,
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

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"
import type { ZernoChannel, ZernoMessageList } from "@/service"
import { buildTimelineEntries } from "./timeline"
import { ChatMessageEntry } from "./message"

const NEW_MESSAGE_SOUND_PATH = "/notification.mp3"

const VirtuosoList = forwardRef<
  HTMLDivElement,
  { style?: CSSProperties; children?: ReactNode }
>(({ style, children }, ref) => (
  <div ref={ref} style={style} className="px-3 md:px-6">
    {children}
  </div>
))

function VirtuosoTopSpacer() {
  return <div className="h-4" />
}

const skeletonWidths = ["w-64", "w-96", "w-48", "w-80", "w-72", "w-56"]

export function ChannelMessageListSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-end gap-4 overflow-hidden px-3 pb-4 md:px-6">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton
              className={cn(
                "h-8 max-w-full rounded-xl",
                skeletonWidths[i % skeletonWidths.length]
              )}
            />
          </div>
        </div>
      ))}
    </div>
  )
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

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const handleDelete = () => {
    if (!myMessageList || !deletingId) return
    service.channels.deleteMessage({
      messageList: myMessageList,
      id: deletingId,
    })
  }
  const lastOwnMessageId =
    entries.findLast((entry) => entry.isOwn)?.message.id ?? null
  useEffect(() => {
    lastOwnMessageIdRef.current = lastOwnMessageId
  }, [lastOwnMessageId, lastOwnMessageIdRef])

  const virtuosoRef = useRef<VirtuosoHandle>(null)

  // Keeps the newest messages in view when the viewport shrinks, e.g. when
  // the on-screen keyboard opens
  const atBottomRef = useRef(true)
  const resizeObserverRef = useRef<ResizeObserver>(null)
  const scrollerRef = useCallback((el: HTMLElement | Window | null) => {
    resizeObserverRef.current?.disconnect()
    if (!(el instanceof HTMLElement)) return
    resizeObserverRef.current = new ResizeObserver(() => {
      if (!atBottomRef.current) return
      virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end" })
    })
    resizeObserverRef.current.observe(el)
  }, [])
  useEffect(() => {
    if (!editingId) return
    const index = entries.findIndex((entry) => entry.message.id === editingId)
    if (index < 0) return
    virtuosoRef.current?.scrollIntoView({ index, behavior: "smooth" })
  }, [editingId, entries])

  if (messages.length === 0) {
    if (messageLists.size < messageListUrls.length) {
      return <ChannelMessageListSkeleton />
    }
    return (
      <Empty className="flex-1">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon" className="size-10">
            <MessageCircleIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">No messages yet</EmptyTitle>
          <EmptyDescription className="text-sm">
            Start the conversation by sending your first message.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <Virtuoso
        ref={virtuosoRef}
        scrollerRef={scrollerRef}
        atBottomStateChange={(atBottom) => {
          atBottomRef.current = atBottom
        }}
        className="flex-1 animate-in overflow-x-hidden overscroll-y-contain duration-200 fade-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        tabIndex={0}
        aria-label="Messages"
        data={entries}
        components={{ List: VirtuosoList, Header: VirtuosoTopSpacer }}
        followOutput={(atBottom) =>
          atBottom &&
          (matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth")
        }
        initialTopMostItemIndex={{ index: "LAST", align: "end" }}
        alignToBottom
        computeItemKey={(_, entry) => entry.message.id}
        itemContent={(_, entry) => (
          <ChatMessageEntry
            {...entry}
            messageList={myMessageList}
            isFresh={Date.now() - entry.message.createdAt < 1000}
            isEditing={editingId === entry.message.id}
            startEditing={startEditing}
            stopEditing={stopEditing}
            startDeleting={setDeletingId}
          />
        )}
      />
      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              It disappears for everyone in the channel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
