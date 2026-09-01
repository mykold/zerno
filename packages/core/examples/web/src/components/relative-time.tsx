import { useEffect, useState } from "react"

import { formatRelativeTime } from "@/utilities"

export const DEFAULT_INTERVAL = 60_000 /* ms */

export interface RelativeTimeProps {
  timestamp: number
  ago?: boolean
  interval?: number
}

export function RelativeTime({
  timestamp,
  ago = false,
  interval = DEFAULT_INTERVAL,
}: RelativeTimeProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), interval)
    return () => clearInterval(id)
  }, [interval])

  return <>{formatRelativeTime(timestamp, ago)}</>
}
