import React, { useEffect, useId, useState } from "react"
import type { AutomergeUrl } from "@automerge/automerge-repo/slim"
import { toast } from "sonner"
import { Access, useDocHandle } from "zerno-react"

import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppContext } from "@/app-context"
import type { ZernoChannel } from "@/service"

// MARK: ChannelInputSkeleton

export function ChannelInputSkeleton() {
  return (
    <footer className="shrink-0 bg-background p-2">
      <div className="flex gap-2">
        <Skeleton className="min-h-12 w-full rounded-2xl" />
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
  const [myAccess, setMyAccess] = useState<Access | undefined>()

  // TODO: Use `zerno-react:useAccess` once it is implemented
  useEffect(() => {
    service.zerno.access
      .getAccess({
        id: selectedChannelUrl,
        member: service.zerno.identity.me().id,
      })
      .then(setMyAccess)
      .catch(toast.error)
  }, [service, selectedChannelUrl])

  const formId = useId()
  const channel = useDocHandle<ZernoChannel>(selectedChannelUrl, {
    suspense: true,
  })

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
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
      return
    }

    e.preventDefault()

    const form = document.getElementById(formId) as HTMLFormElement
    if (!form) throw new Error("Form not found")

    form.requestSubmit()
  }

  return (
    <footer className="shrink-0 bg-background p-2">
      <form id={formId} onSubmit={handleSendMessage} className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message..."
          className="scrollbar-none max-h-40 min-h-12 resize-none overflow-y-auto rounded-2xl bg-muted/50 py-3 pr-12 pl-4 text-base focus-visible:ring-1 focus-visible:ring-offset-0"
          autoComplete="off"
        />
      </form>
    </footer>
  )
}
