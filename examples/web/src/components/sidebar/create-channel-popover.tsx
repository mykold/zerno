import { useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRightIcon, HashIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppContext } from "@/app-context"

export interface CreateChannelPopoverProps {
  children: React.ReactNode
}

export function CreateChannelPopover({ children }: CreateChannelPopoverProps) {
  const navigate = useNavigate()
  const { workspace, service } = useAppContext()

  const [name, setName] = useState("")

  const [isOpen, setIsOpen] = useState(false)
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) setName("")
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    try {
      const handle = await service.workspaces.createChannel({
        workspace,
        name: name.trim(),
      })

      setIsOpen(false)
      setName("")
      navigate(`/channels/${handle.url}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-3 shadow-md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-sm leading-none font-medium">Create channel</h4>
            <p className="text-xs text-muted-foreground">
              Press Enter to create instantly
            </p>
          </div>
          <form onSubmit={handleCreateChannel}>
            <div className="relative flex items-center">
              <HashIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="name"
                placeholder="general"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 pr-9 pl-9 text-sm focus-visible:ring-1"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!name.trim()}
                className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ArrowRightIcon className="h-4 w-4" />
                <span className="sr-only">Create</span>
              </Button>
            </div>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  )
}
