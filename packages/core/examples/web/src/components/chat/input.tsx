import React, { useId, useState } from "react"
import type { AutomergeUrl } from "@automerge/automerge-repo/slim"
import { toast } from "sonner"
import { useDocHandle } from "zerno-react"

import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppContext } from "@/app-context"
import type { ZernoGroup } from "@/service"

// MARK: ChatInputSkeleton

export function ChatInputSkeleton() {
  return (
    <footer className="shrink-0 bg-background p-2">
      <div className="flex gap-2">
        <Skeleton className="min-h-12 w-full rounded-2xl" />
      </div>
    </footer>
  )
}

// MARK: ChatInput

export interface ChatInputProps {
  selectedGroupUrl: AutomergeUrl
}

export function ChatInput({ selectedGroupUrl }: ChatInputProps) {
  const { service } = useAppContext()
  const [content, setContent] = useState("")

  const formId = useId()
  const group = useDocHandle<ZernoGroup>(selectedGroupUrl, {
    suspense: true,
  })

  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      await service.groups.sendMessage({ group, content })
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
