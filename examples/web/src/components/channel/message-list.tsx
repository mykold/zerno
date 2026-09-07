import {
  forwardRef,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useDocHandle, useDocuments } from "zerno-react"
import type { DocHandle } from "@automerge/automerge-repo"
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive"
import { Virtuoso } from "react-virtuoso"
import {
  CircleCheckIcon,
  CircleXIcon,
  MessageCircleIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

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
  /** Trailing gap: same minute, a new minute, or a new run */
  bottomSpacing: "compact" | "normal" | "relaxed"
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
  normal: "pb-2",
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
    const endsGroup =
      endsRun ||
      Math.floor(next.createdAt / 60_000) !==
        Math.floor(message.createdAt / 60_000)
    return {
      message,
      isOwn: message.author === myId,
      isAuthorLead: newDay || previous.author !== message.author,
      dateLabel: newDay && previous ? day : undefined,
      bottomSpacing: endsRun ? "relaxed" : endsGroup ? "normal" : "compact",
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
    <Bubble variant="muted" className="min-w-12">
      <BubbleContent className="py-1 wrap-anywhere">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="min-h-0 w-auto max-w-full resize-none border-none p-0 leading-relaxed focus-visible:ring-0 dark:bg-transparent"
        />
      </BubbleContent>
      <div className="absolute right-0 bottom-full z-10 flex items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-sm">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Cancel editing"
          onClick={onClose}
        >
          <CircleXIcon className="text-destructive" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Save changes"
          onClick={handleSave}
          disabled={!messageList || !draft.trim()}
        >
          <CircleCheckIcon />
        </Button>
      </div>
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

// MARK: MessageActionToolbar

interface MessageActionToolbarProps {
  message: ZernoMessage
  messageList: DocHandle<ZernoMessageList> | undefined
  onEdit: () => void
}

function MessageActionToolbar({
  message,
  messageList,
  onEdit,
}: MessageActionToolbarProps) {
  const { service } = useAppContext()

  const handleDelete = () => {
    if (!messageList) return
    service.channels.deleteMessage({ messageList, id: message.id })
  }

  return (
    <div className="pointer-events-none absolute right-0 bottom-full z-10 flex items-center gap-0.5 rounded-lg border bg-background p-0.5 opacity-0 shadow-sm group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100 has-focus-visible:pointer-events-auto has-focus-visible:opacity-100">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Edit message"
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Delete message"
        onClick={handleDelete}
        disabled={!messageList}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

// MARK: ChatMessageEntry

interface ChatMessageEntryProps extends ChatTimelineEntry {
  messageList: DocHandle<ZernoMessageList> | undefined
}

function ChatMessageEntry({
  message,
  messageList,
  isOwn,
  isAuthorLead,
  dateLabel,
  bottomSpacing,
}: ChatMessageEntryProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className={bottomSpacingClass[bottomSpacing]}>
      {dateLabel && <DayDivider date={dateLabel} />}
      <Message>
        {isAuthorLead ? (
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
        ) : (
          <div className="w-8 shrink-0" />
        )}
        <MessageContent className="gap-2">
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
              onClose={() => setIsEditing(false)}
            />
          ) : (
            <div className="group/row flex min-w-0">
              <Bubble variant="muted" className="min-w-12">
                {!isAuthorLead && (
                  <span className="absolute top-0 right-full mt-1.5 mr-2 text-xs text-muted-foreground opacity-0 group-hover/row:opacity-100">
                    {formatMessageTimestamp(message.createdAt).time}
                  </span>
                )}
                <BubbleContent className="py-1 wrap-anywhere">
                  <MessageExpandableContent content={message.content.val} />
                  {message.editedAt && (
                    <span className="text-xs text-muted-foreground">
                      (edited)
                    </span>
                  )}
                </BubbleContent>
                {isOwn && (
                  <MessageActionToolbar
                    message={message}
                    messageList={messageList}
                    onEdit={() => setIsEditing(true)}
                  />
                )}
              </Bubble>
            </div>
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
  const [myId] = useState(() =>
    uint8ArrayToHex(service.zerno.identity.me().id.toBytes())
  )

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
      className="scrollbar-none flex-1"
      data={entries}
      components={{ List: VirtuosoList, Header: VirtuosoTopSpacer }}
      followOutput="auto"
      initialTopMostItemIndex={entries.length - 1}
      computeItemKey={(_, entry) => entry.message.id}
      itemContent={(_, entry) => (
        <ChatMessageEntry {...entry} messageList={myMessageList} />
      )}
    />
  )
}
