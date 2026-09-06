import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js"

// MARK: formatMessageTimestamp

const formats = {
  time: new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }),
  weekday: new Intl.DateTimeFormat("en", { weekday: "long" }),
  day: new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }),
  dayYear: new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
}

function dayDiff(timestamp: number): number {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(timestamp))) / 86_400_000
  )
}

export function formatDay(timestamp: number): string {
  const days = dayDiff(timestamp)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return formats.weekday.format(timestamp)
  if (new Date(timestamp).getFullYear() === new Date().getFullYear())
    return formats.day.format(timestamp)
  return formats.dayYear.format(timestamp)
}

export function formatMessageTimestamp(timestamp: number): {
  date?: string
  time: string
} {
  if (dayDiff(timestamp) <= 0) return { time: formats.time.format(timestamp) }
  return { date: formatDay(timestamp), time: formats.time.format(timestamp) }
}

// MARK: shrinkIdentifier

export function shrinkIdentifier(
  identifier: string,
  head = 6,
  tail = 4
): string {
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      identifier
    ),
  ].map(({ segment }) => segment)
  if (graphemes.length <= head + tail) return identifier
  return (
    graphemes.slice(0, head).join("") + "..." + graphemes.slice(-tail).join("")
  )
}

// MARK: identifierColor

export function identifierColor(identifier: string, dimColor = false): string {
  const bytes = hexToUint8Array(identifier)

  let hash = 2166136261

  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }

  const hue = (hash >>> 0) % 360

  return hslToHex(hue, 65, dimColor ? 40 : 55)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rgb: [number, number, number]

  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return `#${rgb
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}
