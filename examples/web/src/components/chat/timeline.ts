import { formatDay } from "@/utilities"
import type { ZernoMessage } from "@/service"

/**
 * One message plus everything about it that depends on its neighbours.
 * Virtuoso renders one item per entry, so a long run by a single author
 * never collapses into one unboundedly tall list item.
 */
export interface ChatTimelineEntry {
  message: ZernoMessage
  isOwn: boolean
  /** First message of a run: renders the avatar and the header */
  isAuthorLead: boolean
  /** Day label to render above the message, when the day changed */
  dateLabel?: string
  /** Trailing gap: inside a run by one author, or after that run ends */
  bottomSpacing: "compact" | "relaxed"
}

function dayKey(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function buildTimelineEntries(
  messages: ZernoMessage[],
  myId: string
): ChatTimelineEntry[] {
  const entries = new Array<ChatTimelineEntry>(messages.length)
  let previousDay = 0
  let day = messages.length > 0 ? dayKey(messages[0].createdAt) : 0

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]
    const next = messages[index + 1]
    const nextDay = next ? dayKey(next.createdAt) : 0
    const newDay = index === 0 || day !== previousDay
    const endsRun = !next || next.author !== message.author || nextDay !== day

    entries[index] = {
      message,
      isOwn: message.author === myId,
      isAuthorLead: newDay || messages[index - 1].author !== message.author,
      dateLabel: newDay && index > 0 ? formatDay(message.createdAt) : undefined,
      bottomSpacing: endsRun ? "relaxed" : "compact",
    }

    previousDay = day
    day = nextDay
  }
  return entries
}
