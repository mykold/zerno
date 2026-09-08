import {
  forwardRef,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useDocHandle, useDocuments } from "zerno-react"
import type { DocHandle } from "@automerge/automerge-repo"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import {
  CopyIcon,
  MessageCircleIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { useAppContext } from "@/app-context"
import { useMessages } from "@/hooks/use-messages"
import { useNewMessageSound } from "@/hooks/use-message-sound"
import { useNewMessageTitle } from "@/hooks/use-new-message-title"
import { identifierColor, formatDay, formatMessageTimestamp } from "@/utilities"
import { Markdown } from "@/components/ui/markdown"
import { MessageTimestamp } from "@/components/message-timestamp"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ZernoChannel, ZernoMessage, ZernoMessageList } from "@/service"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent, MessageHeader } from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { Badge } from "../ui/badge"

// MARK: DayDivider

interface DayDividerProps {
  date: string
}

function DayDivider({ date }: DayDividerProps) {
  return (
    <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {date}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

// MARK: ChatTimelineEntry

/**
 * One message plus everything about it that depends on its neighbours.
 * Virtuoso renders one item per entry, so a long run by a single author
 * never collapses into one unboundedly tall list item.
 */
interface ChatTimelineEntry {
  message: ZernoMessage
  isOwn: boolean
  /** First message of a run: renders the avatar and the header */
  isAuthorLead: boolean
  /** Day label to render above the message, when the day changed */
  dateLabel?: string
  /** Trailing gap: inside a run by one author, or after that run ends */
  bottomSpacing: "compact" | "relaxed"
}

// TODO: Make this configurable
const MESSAGE_PREVIEW_LENGTH = 2000

const bottomSpacingClass = {
  compact: "pb-1",
  relaxed: "pb-6",
} as const

function dayKey(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function buildTimelineEntries(
  messages: ZernoMessage[],
  myId: string
): ChatTimelineEntry[] {
  const entries = new Array<ChatTimelineEntry>(messages.length)
  let previousDay = 0
  let day = messages.length > 0 ? dayKey(messages[0].createdAt) : 0

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]
    const next = messages[index + 1]
    const nextDay = next ? dayKey(next.createdAt) : 0
    const newDay = index === 0 || day !== previousDay
    const endsRun = !next || next.author !== message.author || nextDay !== day

    entries[index] = {
      message,
      isOwn: message.author === myId,
      isAuthorLead: newDay || messages[index - 1].author !== message.author,
      dateLabel: newDay && index > 0 ? formatDay(message.createdAt) : undefined,
      bottomSpacing: endsRun ? "relaxed" : "compact",
    }

    previousDay = day
    day = nextDay
  }
  return entries
}

// MARK: MessageInlineEditor

interface MessageInlineEditorProps {
  message: ZernoMessage
  messageList: DocHandle<ZernoMessageList> | undefined
  onClose: () => void
}

function MessageInlineEditor({
  message,
  messageList,
  onClose,
}: MessageInlineEditorProps) {
  const { service } = useAppContext()
  const [draft, setDraft] = useState(message.content.val)

  const handleSave = () => {
    if (!messageList) return
    if (!draft.trim()) return
    service.channels.editMessage({
      messageList,
      id: message.id,
      content: draft.trim(),
    })
    onClose()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      onClose()
      return
    }
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
      return
    }
    e.preventDefault()
    handleSave()
  }

  return (
    <Bubble variant="outline">
      <BubbleContent className="py-1">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          onFocus={(e) =>
            e.currentTarget.setSelectionRange(draft.length, draft.length)
          }
          className="min-h-0 w-auto max-w-full resize-none border-none p-0 leading-relaxed focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex gap-3">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
            onClick={onClose}
          >
            escape to cancel
          </Button>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
            onClick={handleSave}
            disabled={!messageList || !draft.trim()}
          >
            enter to save
          </Button>
        </div>
      </BubbleContent>
    </Bubble>
  )
}

// MARK: MessageExpandableContent

interface MessageExpandableContentProps {
  content: string
}

function MessageExpandableContent({ content }: MessageExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (isExpanded || content.length <= MESSAGE_PREVIEW_LENGTH) {
    return <Markdown>{content}</Markdown>
  }

  return (
    <>
      <div className="relative max-h-64 overflow-hidden">
        <Markdown>{content.slice(0, MESSAGE_PREVIEW_LENGTH)}</Markdown>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-bubble to-transparent" />
      </div>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-muted-foreground"
        onClick={() => setIsExpanded(true)}
      >
        Show all
      </Button>
    </>
  )
}

// MARK: MessageActions

interface MessageAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

interface MessageActionsArgs {
  isOwn: boolean
  canDelete: boolean
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

function getMessageActions({
  isOwn,
  canDelete,
  onCopy,
  onEdit,
  onDelete,
}: MessageActionsArgs): MessageAction[] {
  const actions: MessageAction[] = [
    {
      label: "Copy",
      icon: CopyIcon,
      onSelect: onCopy,
    },
  ]
  if (isOwn) {
    actions.push(
      {
        label: "Edit",
        icon: PencilIcon,
        onSelect: onEdit,
      },
      {
        label: "Delete",
        icon: Trash2Icon,
        onSelect: onDelete,
        variant: "destructive",
        disabled: !canDelete,
      }
    )
  }
  return actions
}

const messageActionsClass =
  "pointer-events-none absolute top-0 left-full z-10 mt-0.5 ml-1 flex items-center gap-0.5 opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 has-focus-visible:pointer-events-auto has-focus-visible:opacity-100"

interface MessageActionsProps {
  actions: MessageAction[]
}

function MessageActionButtons({ actions }: MessageActionsProps) {
  return (
    <div
      className={messageActionsClass}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {actions.map(({ label, icon: Icon, onSelect, variant, disabled }) => (
        <Button
          key={label}
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          onClick={onSelect}
          disabled={disabled}
          className={cn(
            "text-muted-foreground",
            variant === "destructive" && "hover:text-destructive"
          )}
        >
          <Icon strokeWidth={1.5} />
        </Button>
      ))}
    </div>
  )
}

function MessageActionMenuItems({ actions }: MessageActionsProps) {
  return actions.map(({ label, icon: Icon, ...action }) => (
    <ContextMenuItem key={label} {...action}>
      <Icon />
      {label}
    </ContextMenuItem>
  ))
}

// MARK: MessageBubble

interface MessageBubbleProps {
  message: ZernoMessage
  messageList: DocHandle<ZernoMessageList> | undefined
  isOwn: boolean
  isAuthorLead: boolean
  onEdit: () => void
}

function MessageBubble({
  message,
  messageList,
  isOwn,
  isAuthorLead,
  onEdit,
}: MessageBubbleProps) {
  const { service } = useAppContext()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content.val)
    toast.success("Message copied to clipboard")
  }

  const handleDelete = () => {
    if (!messageList) return
    service.channels.deleteMessage({ messageList, id: message.id })
  }

  const actions = getMessageActions({
    isOwn,
    canDelete: !!messageList,
    onCopy: handleCopy,
    onEdit,
    onDelete: handleDelete,
  })

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className="select-text">
        <Bubble variant="chat">
          {!isAuthorLead && (
            <span className="absolute top-0 right-full mt-1.5 mr-2 text-xs text-muted-foreground opacity-0 group-hover/row:opacity-100">
              {formatMessageTimestamp(message.createdAt).time}
            </span>
          )}
          <BubbleContent className="px-2.5 py-1">
            <MessageExpandableContent content={message.content.val} />
            {message.editedAt && (
              <span className="text-xs text-muted-foreground"> (edited)</span>
            )}
          </BubbleContent>
          <MessageActionButtons actions={actions} />
        </Bubble>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <MessageActionMenuItems actions={actions} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

// MARK: ChatMessageEntry

interface ChatMessageEntryProps extends ChatTimelineEntry {
  messageList: DocHandle<ZernoMessageList> | undefined
  isEditing: boolean
  startEditing: (id: string) => void
  stopEditing: () => void
}

const ChatMessageEntry = memo(function ChatMessageEntry({
  message,
  messageList,
  isOwn,
  isAuthorLead,
  dateLabel,
  bottomSpacing,
  isEditing,
  startEditing,
  stopEditing,
}: ChatMessageEntryProps) {
  return (
    <div
      className={cn(
        "group/row",
        bottomSpacingClass[bottomSpacing],
        isEditing && "-mx-6 rounded-md bg-amber-500/10 px-6"
      )}
    >
      {dateLabel && <DayDivider date={dateLabel} />}
      <Message>
        {isAuthorLead && (
          <Avatar>
            <AvatarFallback
              className="text-xs font-medium text-white"
              style={{ backgroundColor: identifierColor(message.author) }}
            >
              {message.author.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <MessageContent className={cn("gap-2", !isAuthorLead && "ps-10")}>
          {isAuthorLead && (
            <MessageHeader className="gap-2">
              <span
                className="font-semibold"
                style={{ color: identifierColor(message.author, true) }}
              >
                {message.author}
              </span>
              {isOwn && <Badge variant="secondary">you</Badge>}
              <MessageTimestamp timestamp={message.createdAt} />
            </MessageHeader>
          )}
          {isEditing ? (
            <MessageInlineEditor
              message={message}
              messageList={messageList}
              onClose={stopEditing}
            />
          ) : (
            <MessageBubble
              message={message}
              messageList={messageList}
              isOwn={isOwn}
              isAuthorLead={isAuthorLead}
              onEdit={() => startEditing(message.id)}
            />
          )}
        </MessageContent>
      </Message>
    </div>
  )
})

// MARK: ChannelMessageList

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
