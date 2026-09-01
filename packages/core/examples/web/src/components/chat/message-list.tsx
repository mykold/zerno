import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useDocHandle, useDocuments } from "zerno-react"
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo"
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive"
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
import { identifierColor } from "@/utilities"
import { Markdown } from "@/components/ui/markdown"
import { RelativeTime } from "@/components/relative-time"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ZernoGroup, ZernoMessage, ZernoMessageList } from "@/service"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// MARK: ChatMessageRow

interface ChatMessageRowProps {
  message: ZernoMessage
  messageList: DocHandle<ZernoMessageList> | undefined
  isOwn: boolean
}

function ChatMessageRow({ message, messageList, isOwn }: ChatMessageRowProps) {
  const { service } = useAppContext()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

  const startEditing = () => {
    setDraft(message.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!messageList) return
    const content = draft.trim()
    if (!content) return
    service.groups.editMessage({ messageList, id: message.id, content })
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!messageList) return
    service.groups.deleteMessage({ messageList, id: message.id })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setIsEditing(false)
      return
    }
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
      return
    }
    e.preventDefault()
    handleSave()
  }

  if (isEditing) {
    return (
      <Bubble variant="muted" className="min-w-16">
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
            onClick={() => setIsEditing(false)}
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

  return (
    <Bubble variant="muted" className="min-w-16">
      <BubbleContent className="py-1 wrap-anywhere">
        <Markdown>{message.content}</Markdown>
        {message.editedAt ? (
          <span className="ml-2 text-xs text-muted-foreground">
            (edited <RelativeTime timestamp={message.editedAt} ago />)
          </span>
        ) : null}
      </BubbleContent>
      {isOwn && (
        <div className="pointer-events-none absolute right-0 bottom-full z-10 flex items-center gap-0.5 rounded-lg border bg-background p-0.5 opacity-0 shadow-sm group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100 has-focus-visible:pointer-events-auto has-focus-visible:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Edit message"
            onClick={startEditing}
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
      )}
    </Bubble>
  )
}

// MARK: ChatMessageRun

interface ChatMessageRunProps {
  author: string
  createdAt: number
  messages: ZernoMessage[]
  messageListUrl?: AutomergeUrl
  myId?: string
}

function ChatMessageRun({
  author,
  createdAt,
  messages,
  messageListUrl,
  myId,
}: ChatMessageRunProps) {
  const isOwn = author === myId
  const messageList = useDocHandle<ZernoMessageList>(
    isOwn ? messageListUrl : undefined,
    { suspense: false }
  )

  return (
    <Message>
      <MessageAvatar>
        <Avatar className="h-8 w-8">
          <AvatarFallback
            className="text-xs font-medium text-white"
            style={{ backgroundColor: identifierColor(author) }}
          >
            {author.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent className="gap-1">
        <MessageHeader className="gap-2">
          <span className="font-semibold">{author}</span>
          <RelativeTime timestamp={createdAt} />
        </MessageHeader>
        <BubbleGroup className="gap-1">
          {messages.map((message) => (
            <ChatMessageRow
              key={message.id}
              message={message}
              messageList={messageList}
              isOwn={isOwn}
            />
          ))}
        </BubbleGroup>
      </MessageContent>
    </Message>
  )
}

// MARK: ChatMessageList

const NEW_MESSAGE_SOUND_PATH = "/notification.mp3"

export interface ChatMessageListProps {
  selectedGroup: ZernoGroup
}

export function ChatMessageList({ selectedGroup }: ChatMessageListProps) {
  const { service } = useAppContext()
  const [myId] = useState(() =>
    uint8ArrayToHex(service.zerno.identity.me().id.toBytes())
  )

  const messageListUrls = useMemo(() => {
    if (!selectedGroup?.messages) return []
    return Object.values(selectedGroup.messages)
  }, [selectedGroup.messages])
  const [messageLists] = useDocuments<ZernoMessageList>(messageListUrls, {
    suspense: false,
  })

  const messages = useMessages(messageLists, {
    limit: 255, // TODO: Make this configurable
    order: "desc",
  })

  // TODO: Make this configurable
  useNewMessageSound(messages, myId, NEW_MESSAGE_SOUND_PATH)
  useNewMessageTitle(messages, myId)

  const messageRuns = useMemo<ChatMessageRunProps[]>(() => {
    const runs: ChatMessageRunProps[] = []
    for (const message of messages) {
      const last = runs[runs.length - 1]
      if (last && last.author === message.author) {
        last.messages.push(message)
      } else {
        runs.push({
          author: message.author,
          createdAt: message.createdAt,
          messages: [message],
          messageListUrl: selectedGroup.messages[message.author],
          myId,
        })
      }
    }
    return runs
  }, [messages, selectedGroup.messages, myId])

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    <div className="scrollbar-none flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      {messageRuns.map((run) => (
        <ChatMessageRun key={run.messages[0].id} {...run} />
      ))}
      <div ref={scrollRef}></div>
    </div>
  )
}
