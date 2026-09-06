import { useEffect, useState } from "react"

import { formatMessageTimestamp } from "@/utilities"

export interface MessageTimestampProps {
  timestamp: number
}

export function MessageTimestamp({ timestamp }: MessageTimestampProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const now = new Date()
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      )
      timer = setTimeout(() => {
        setTick((tick) => tick + 1)
        schedule()
      }, midnight.getTime() - now.getTime())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [timestamp])

  const { date, time } = formatMessageTimestamp(timestamp)

  return (
    <span className="text-xs text-muted-foreground">
      {date && `${date} `}
      {time}
    </span>
  )
}
