import {
  Fragment,
  forwardRef,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useDocHandle, useDocuments } from "zerno-react"
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo"
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
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// MARK: DayDivider

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

// MARK: ChannelMessageRow

interface ChannelMessageRowProps {
  message: ZernoMessage
  messageList: DocHandle<ZernoMessageList> | undefined
  isOwn: boolean
  /** Rows after the first one show their timestamp only on hover */
  showTimestamp: boolean
}

function ChannelMessageRow({
  message,
  messageList,
  isOwn,
  showTimestamp,
}: ChannelMessageRowProps) {
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
    service.channels.editMessage({ messageList, id: message.id, content })
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!messageList) return
    service.channels.deleteMessage({ messageList, id: message.id })
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
    <div className="group/row flex min-w-0">
      <Bubble variant="muted" className="min-w-12">
        {showTimestamp && (
          <span className="absolute top-0 right-full mt-1.5 mr-2 text-xs text-muted-foreground opacity-0 group-hover/row:opacity-100">
            {formatMessageTimestamp(message.createdAt).time}
          </span>
        )}
        <BubbleContent className="py-1 wrap-anywhere">
          <Markdown>{message.content}</Markdown>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
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
    </div>
  )
}

// MARK: ChannelMessageRun

interface ChannelMessageRunProps {
  author: string
  createdAt: number
  messages: ZernoMessage[]
  messageListUrl?: AutomergeUrl
  myId?: string
}

function ChannelMessageRun({
  author,
  createdAt,
  messages,
  messageListUrl,
  myId,
}: ChannelMessageRunProps) {
  const isOwn = author === myId
  const messageList = useDocHandle<ZernoMessageList>(
    isOwn ? messageListUrl : undefined,
    { suspense: false }
  )

  // Split messages into per-minute bubble groups
  const groups = useMemo(() => {
    const groups: ZernoMessage[][] = []
    for (const message of messages) {
      const last = groups[groups.length - 1]
      if (
        last &&
        Math.floor(last[0].createdAt / 60_000) ===
          Math.floor(message.createdAt / 60_000)
      ) {
        last.push(message)
      } else {
        groups.push([message])
      }
    }
    return groups
  }, [messages])

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
      <MessageContent className="gap-2">
        <MessageHeader className="gap-2">
          <span
            className="font-semibold"
            style={{ color: identifierColor(author, true) }}
          >
            {author}
          </span>
          <MessageTimestamp timestamp={createdAt} />
        </MessageHeader>
        {groups.map((group, groupIndex) => {
          const divider =
            groupIndex > 0 &&
            formatDay(group[0].createdAt) !==
              formatDay(groups[groupIndex - 1][0].createdAt)
          return (
            <Fragment key={group[0].id}>
              {divider && <DayDivider label={formatDay(group[0].createdAt)} />}
              <BubbleGroup className="gap-1">
                {group.map((message, messageIndex) => (
                  <ChannelMessageRow
                    key={message.id}
                    message={message}
                    messageList={messageList}
                    isOwn={isOwn}
                    showTimestamp={groupIndex > 0 || messageIndex > 0}
                  />
                ))}
              </BubbleGroup>
            </Fragment>
          )
        })}
      </MessageContent>
    </Message>
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

  const messages = useMessages(messageLists)

  // TODO: Make this configurable
  useNewMessageSound(messages, myId, NEW_MESSAGE_SOUND_PATH)
  useNewMessageTitle(messages, myId)

  const messageRuns = useMemo<ChannelMessageRunProps[]>(() => {
    const runs: ChannelMessageRunProps[] = []
    for (const message of messages) {
      const last = runs[runs.length - 1]
      if (last && last.author === message.author) {
        last.messages.push(message)
      } else {
        runs.push({
          author: message.author,
          createdAt: message.createdAt,
          messages: [message],
          messageListUrl: selectedChannel.messages[message.author],
          myId,
        })
      }
    }
    return runs
  }, [messages, selectedChannel.messages, myId])

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
      data={messageRuns}
      components={{ List: VirtuosoList, Header: VirtuosoTopSpacer }}
      followOutput="auto"
      initialTopMostItemIndex={messageRuns.length - 1}
      computeItemKey={(_, run) => run.messages[0].id}
      itemContent={(index, run) => {
        const divider =
          index > 0 &&
          formatDay(run.createdAt) !==
            formatDay(messageRuns[index - 1].createdAt)
        return (
          <div className="pb-6">
            {divider && <DayDivider label={formatDay(run.createdAt)} />}
            <ChannelMessageRun {...run} />
          </div>
        )
      }}
    />
  )
}
