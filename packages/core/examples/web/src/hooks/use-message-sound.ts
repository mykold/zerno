import useSound from "use-sound"

import { useNewMessage } from "@/hooks/use-new-message"
import type { ZernoMessage } from "@/service"

export function useNewMessageSound(
  messages: ZernoMessage[],
  myId: string,
  src: string
) {
  const [play] = useSound(src, { interrupt: true })

  useNewMessage(messages, myId, () => {
    if (!document.hidden && document.hasFocus()) return
    play()
  })
}
