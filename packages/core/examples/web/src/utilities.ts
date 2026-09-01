import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js"

export function formatRelativeTime(
  timestamp: number,
  ago: boolean = false
): string {
  if (ago) {
    const result = formatRelativeTime(timestamp)
    return result === "now" ? "just now" : `${result} ago`
  }
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3_600)}h`
  return `${Math.floor(seconds / 86_400)}d`
}

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

export function identifierColor(identifier: string): string {
  const bytes = hexToUint8Array(identifier)

  let hash = 2166136261

  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }

  const hue = (hash >>> 0) % 360

  return hslToHex(hue, 65, 55)
}

export function hslToHex(h: number, s: number, l: number): string {
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
