import React, { useId, useState } from "react"
import { SendHorizontalIcon } from "lucide-react"
import type { AutomergeUrl } from "@automerge/automerge-repo/slim"
import { toast } from "sonner"
import { Access, useAccess, useDocHandle, useDocSelector } from "zerno-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppContext } from "@/app-context"
import { useMessageEditing } from "@/hooks/use-message-editing"
import { useIsTouch } from "@/hooks/use-touch"
import type { ZernoChannel } from "@/service"

// MARK: ChannelInputSkeleton

export function ChannelInputSkeleton() {
  return (
    <footer className="shrink-0 bg-background px-3 pt-1 pb-2 md:px-6">
      <div className="flex gap-2">
        <Skeleton className="min-h-10 w-full rounded-xl" />
      </div>
    </footer>
  )
}

// MARK: ChannelInput

export interface ChannelInputProps {
  selectedChannelUrl: AutomergeUrl
}

export function ChannelInput({ selectedChannelUrl }: ChannelInputProps) {
  const { service } = useAppContext()
  const [content, setContent] = useState("")
  const myAccess = useAccess(selectedChannelUrl)
  const { startEditing, composerRef, lastOwnMessageIdRef } = useMessageEditing()
  const isTouch = useIsTouch()

  const formId = useId()
  const channel = useDocHandle<ZernoChannel>(selectedChannelUrl, {
    suspense: true,
  })
  const name = useDocSelector(channel, (d) => d.name)

  if (!myAccess?.atLeast(Access.edit())) return null

  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      await service.channels.sendMessage({ channel, content: content.trim() })
    } catch (e) {
      const message = (e as Error).message
      toast.error(message)
      return
    }

    setContent("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "ArrowUp" && !content && lastOwnMessageIdRef.current) {
      e.preventDefault()
      startEditing(lastOwnMessageIdRef.current)
      return
    }

    if (
      isTouch ||
      e.key !== "Enter" ||
      e.shiftKey ||
      e.nativeEvent.isComposing
    ) {
      return
    }

    e.preventDefault()

    const form = document.getElementById(formId) as HTMLFormElement
    if (!form) throw new Error("Form not found")

    form.requestSubmit()
  }

  return (
    <footer className="shrink-0 bg-background px-3 pt-1 pb-2 md:px-6">
      <form
        id={formId}
        onSubmit={handleSendMessage}
        className="relative flex gap-2"
      >
        <Textarea
          ref={composerRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={`Message #${name}`}
          className="scrollbar-none max-h-40 min-h-10 resize-none overflow-y-auto rounded-xl bg-muted/50 py-2 pr-12 pl-3 text-base focus-visible:ring-1 focus-visible:ring-offset-0"
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Send"
          disabled={!content.trim()}
          className="absolute right-1 bottom-1 text-muted-foreground hover:text-foreground"
        >
          <SendHorizontalIcon />
        </Button>
      </form>
    </footer>
  )
}
