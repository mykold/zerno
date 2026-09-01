import { useEffect, useRef } from "react"

import { useNewMessage } from "@/hooks/use-new-message"
import type { ZernoMessage } from "@/service"

export function useNewMessageTitle(messages: ZernoMessage[], myId: string) {
  const unreadsRef = useRef(0)
  const baseTitleRef = useRef(document.title)

  useNewMessage(messages, myId, () => {
    if (!document.hidden && document.hasFocus()) return

    unreadsRef.current += 1
    document.title = `(${unreadsRef.current}) ${baseTitleRef.current}`
  })

  useEffect(() => {
    const baseTitle = baseTitleRef.current

    const reset = () => {
      if (document.hidden) return

      unreadsRef.current = 0
      document.title = baseTitle
    }

    window.addEventListener("focus", reset)
    document.addEventListener("visibilitychange", reset)

    return () => {
      window.removeEventListener("focus", reset)
      document.removeEventListener("visibilitychange", reset)

      unreadsRef.current = 0
      document.title = baseTitle
    }
  }, [])
}
