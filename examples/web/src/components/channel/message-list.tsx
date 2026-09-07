import {
  forwardRef,
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
  EllipsisIcon,
  MessageCircleIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { useAppContext } from "@/app-context"
import { useMessages } from "@/hooks/use-messages"
import { useMessageEditing } from "@/hooks/use-message-editing"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"

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

// Long messages are revealed one chunk at a time, so a single message can
// neither take over the viewport nor make one click parse an unbounded
// amount of markdown.
// ponytail: fully expanding a huge message still materialises all of it;
// splitting one message across several virtualized rows is the upgrade path.
// TODO: Make this configurable
const MESSAGE_CHUNK_LENGTH = 2000

const bottomSpacingClass = {
  compact: "pb-1",
  relaxed: "pb-6",
} as const

function buildTimelineEntries(
  messages: ZernoMessage[],
  myId: string
): ChatTimelineEntry[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1]
    const next = messages[index + 1]
    const day = formatDay(message.createdAt)
    const newDay = !previous || formatDay(previous.createdAt) !== day
    const endsRun =
      !next ||
      next.author !== message.author ||
      formatDay(next.createdAt) !== day
    return {
      message,
      isOwn: message.author === myId,
      isAuthorLead: newDay || previous.author !== message.author,
      dateLabel: newDay && previous ? day : undefined,
      bottomSpacing: endsRun ? "relaxed" : "compact",
    }
  })
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
    const content = draft.trim()
    if (!content) return
    service.channels.editMessage({ messageList, id: message.id, content })
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
    <Bubble variant="outline" className="min-w-12">
      <BubbleContent className="py-1 wrap-anywhere">
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
  const [visibleLength, setVisibleLength] = useState(MESSAGE_CHUNK_LENGTH)

  const isExpanded = visibleLength > MESSAGE_CHUNK_LENGTH
  const hasMore = isExpanded && visibleLength < content.length

  if (content.length <= MESSAGE_CHUNK_LENGTH) {
    return <Markdown>{content}</Markdown>
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={(open) =>
        setVisibleLength(open ? MESSAGE_CHUNK_LENGTH * 2 : MESSAGE_CHUNK_LENGTH)
      }
    >
      {/* Every state renders one slice as a single markdown node: splitting
          the content across two nodes would break blocks across the cut. */}
      {!isExpanded && (
        <Markdown>{`${content.slice(0, MESSAGE_CHUNK_LENGTH)}…`}</Markdown>
      )}
      <CollapsibleContent>
        <Markdown>
          {hasMore ? `${content.slice(0, visibleLength)}…` : content}
        </Markdown>
      </CollapsibleContent>
      <div className="flex gap-3">
        {hasMore && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
            onClick={() =>
              setVisibleLength(visibleLength + MESSAGE_CHUNK_LENGTH)
            }
          >
            Show more
          </Button>
        )}
        <CollapsibleTrigger asChild>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
          >
            {isExpanded ? "Collapse" : "Show more"}
          </Button>
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  )
}

// MARK: MessageBubble

interface MessageBubbleProps {
  message: ZernoMessage
  messageList: DocHandle<ZernoMessageList> | undefined
  isOwn: boolean
  isAuthorLead: boolean
  onEdit: () => void
}

/**
 * The message itself, plus its actions when it is ours, reachable however
 * the reader is holding the machine: the button for a mouse, a right click
 * for a trackpad, a long press on touch (Radix turns that into the same
 * context menu), and Tab for a keyboard.
 *
 * The bubble is already the positioning context and already carries the
 * width bounds, so both menus hang off it directly rather than off a
 * wrapper: one node fewer on every row of a virtualized list.
 */
function MessageBubble({
  message,
  messageList,
  isOwn,
  isAuthorLead,
  onEdit,
}: MessageBubbleProps) {
  const { service } = useAppContext()

  const handleDelete = () => {
    if (!messageList) return
    service.channels.deleteMessage({ messageList, id: message.id })
  }

  const bubble = (
    <Bubble variant="chat" className="min-w-12">
      {!isAuthorLead && (
        <span className="absolute top-0 right-full mt-1.5 mr-2 text-xs text-muted-foreground opacity-0 group-hover/row:opacity-100">
          {formatMessageTimestamp(message.createdAt).time}
        </span>
      )}
      <BubbleContent className="py-1 wrap-anywhere">
        <MessageExpandableContent content={message.content.val} />
        {message.editedAt && (
          <span className="text-xs text-muted-foreground"> (edited)</span>
        )}
      </BubbleContent>
      {isOwn && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Message actions"
              className="pointer-events-none absolute top-0 left-full z-10 mt-0.5 ml-1 opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
            >
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleDelete}
              disabled={!messageList}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </Bubble>
  )

  if (!isOwn) return bubble

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{bubble}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onEdit}>
          <PencilIcon />
          Edit
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onSelect={handleDelete}
          disabled={!messageList}
        >
          <Trash2Icon />
          Delete
        </ContextMenuItem>
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

function ChatMessageEntry({
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
          <MessageAvatar>
            <Avatar className="h-8 w-8">
              <AvatarFallback
                className="text-xs font-medium text-white"
                style={{ backgroundColor: identifierColor(message.author) }}
              >
                {message.author.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </MessageAvatar>
        )}
        {/* Standing in for the avatar column: min-w-8 plus the row's gap-2 */}
        <MessageContent className={cn("gap-2", !isAuthorLead && "ps-10")}>
          {isAuthorLead && (
            <MessageHeader className="gap-2">
              <span
                className="font-semibold"
                style={{ color: identifierColor(message.author, true) }}
              >
                {message.author}
              </span>
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
}

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
  // Published for the composer, which edits this message on ArrowUp. A ref
  // rather than state so a new message does not re-render the composer.
  const lastOwnMessageId =
    entries.findLast((entry) => entry.isOwn)?.message.id ?? null
  useEffect(() => {
    lastOwnMessageIdRef.current = lastOwnMessageId
  }, [lastOwnMessageId, lastOwnMessageIdRef])

  // ArrowUp can open an editor that is scrolled far above the composer
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
