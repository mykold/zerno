import { memo, useState, type KeyboardEvent } from "react"
import type { DocHandle } from "@automerge/automerge-repo"
import { toast } from "sonner"

import { useAppContext } from "@/app-context"
import { identifierColor, formatMessageTimestamp } from "@/utilities"
import { Markdown } from "@/components/ui/markdown"
import { MessageTimestamp } from "@/components/message-timestamp"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent, MessageHeader } from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import type { ZernoMessage, ZernoMessageList } from "@/service"
import type { ChatTimelineEntry } from "./timeline"
import {
  getMessageActions,
  MessageActionButtons,
  MessageActionMenuItems,
} from "./actions"

// TODO: Make this configurable
const MESSAGE_PREVIEW_LENGTH = 2000

const bottomSpacingClass = {
  compact: "pb-1",
  relaxed: "pb-6",
} as const

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

export interface ChatMessageEntryProps extends ChatTimelineEntry {
  messageList: DocHandle<ZernoMessageList> | undefined
  isEditing: boolean
  startEditing: (id: string) => void
  stopEditing: () => void
}

export const ChatMessageEntry = memo(function ChatMessageEntry({
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
