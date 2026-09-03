import { useState } from "react"
import { toast } from "sonner"
import { ArrowRightIcon, LinkIcon, Loader2Icon } from "lucide-react"
import type { AutomergeUrl } from "@automerge/automerge-repo"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAppContext } from "@/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface OpenChannelPopoverProps {
  children: React.ReactNode
}

export function OpenChannelPopover({ children }: OpenChannelPopoverProps) {
  const { workspace, service } = useAppContext()

  const [url, setUrl] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setUrl("")
      setIsOpening(false)
    }
  }

  const handleOpenChannel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim() || isOpening) return

    setIsOpening(true)
    try {
      const channel = await service.channels.find(url.trim() as AutomergeUrl)
      await service.workspaces.openChannel({
        workspace,
        channel,
      })

      setIsOpen(false)
      setUrl("")
      toast.success("Channel opened successfully")
    } catch (e) {
      const message = (e as Error).message
      toast.error(message)
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 p-3 shadow-md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-sm leading-none font-medium">Open channel</h4>
            <p className="text-xs text-muted-foreground">
              Paste the URL that another user gave you here
            </p>
          </div>
          <form onSubmit={handleOpenChannel}>
            <div className="relative flex items-center">
              <LinkIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground/70" />
              <Input
                id="url"
                placeholder="automerge:2WN9h4..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-9 pr-9 pl-9 text-sm focus-visible:ring-1"
                autoComplete="off"
                disabled={isOpening}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!url.trim() || isOpening}
                className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {isOpening ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightIcon className="h-4 w-4" />
                )}
                <span className="sr-only">Open</span>
              </Button>
            </div>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  )
}
