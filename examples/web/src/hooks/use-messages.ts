import { useMemo } from "react"
import type { DocMap } from "@automerge/react"

import type { ZernoMessage, ZernoMessageList } from "@/service/messages.js"

export function useMessages(messageLists: DocMap<ZernoMessageList>) {
  return useMemo(() => {
    if (!messageLists || messageLists.size === 0) return []
    const messages: ZernoMessage[] = []
    for (const doc of messageLists.values()) {
      if (!doc) continue
      messages.push(...doc.messages)
    }
    messages.sort((a, b) => a.createdAt - b.createdAt)
    return messages
  }, [messageLists])
}
