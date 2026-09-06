import { useEffect, useRef } from "react"

import type { ZernoMessage } from "@/service"

export function useNewMessage(
  messages: ZernoMessage[],
  myId: string,
  onNewMessage: (message: ZernoMessage) => void
) {
  const latestRef = useRef<{ id: string; createdAt: number } | null>(null)

  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (!latest) return

    const previous = latestRef.current
    latestRef.current = { id: latest.id, createdAt: latest.createdAt }

    // Only react to a message newer than the previous latest, so loading
    // history or deleting the last message never triggers the handler.
    if (!previous) return
    if (latest.id === previous.id || latest.createdAt <= previous.createdAt) {
      return
    }
    if (latest.author === myId) return

    onNewMessage(latest)
  }, [messages, myId, onNewMessage])
}
