import type { CSSProperties } from "react"
import { toast } from "sonner"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { shrinkIdentifier } from "@/utilities"

export interface IdentifierProps {
  id: string
  className?: string
  style?: CSSProperties
}

export function Identifier({ id, className, style }: IdentifierProps) {
  const onClick = async () => {
    await navigator.clipboard.writeText(id)
    toast.success("Identifier copied to clipboard")
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn("cursor-pointer truncate hover:underline", className)}
          style={style}
        >
          {shrinkIdentifier(id)}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-125 text-center font-mono text-xs break-all select-all"
      >
        {id}
      </TooltipContent>
    </Tooltip>
  )
}
