import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ContextMenuItem } from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"

export interface MessageAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

interface MessageActionsArgs {
  isOwn: boolean
  canDelete: boolean
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export function getMessageActions({
  isOwn,
  canDelete,
  onCopy,
  onEdit,
  onDelete,
}: MessageActionsArgs): MessageAction[] {
  const actions: MessageAction[] = [
    {
      label: "Copy",
      icon: CopyIcon,
      onSelect: onCopy,
    },
  ]
  if (isOwn) {
    actions.push(
      {
        label: "Edit",
        icon: PencilIcon,
        onSelect: onEdit,
      },
      {
        label: "Delete",
        icon: Trash2Icon,
        onSelect: onDelete,
        variant: "destructive",
        disabled: !canDelete,
      }
    )
  }
  return actions
}

const messageActionsClass =
  "pointer-events-none absolute top-0 left-full z-10 mt-0.5 ml-1 flex items-center gap-0.5 opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 has-focus-visible:pointer-events-auto has-focus-visible:opacity-100"

interface MessageActionsProps {
  actions: MessageAction[]
}

export function MessageActionButtons({ actions }: MessageActionsProps) {
  return (
    <div
      className={messageActionsClass}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {actions.map(({ label, icon: Icon, onSelect, variant, disabled }) => (
        <Button
          key={label}
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          onClick={onSelect}
          disabled={disabled}
          className={cn(
            "text-muted-foreground",
            variant === "destructive" && "hover:text-destructive"
          )}
        >
          <Icon strokeWidth={1.5} />
        </Button>
      ))}
    </div>
  )
}

export function MessageActionMenuItems({ actions }: MessageActionsProps) {
  return actions.map(({ label, icon: Icon, ...action }) => (
    <ContextMenuItem key={label} {...action}>
      <Icon />
      {label}
    </ContextMenuItem>
  ))
}
