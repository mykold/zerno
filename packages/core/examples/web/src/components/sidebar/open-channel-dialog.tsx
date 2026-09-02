import { useState } from "react"
import { toast } from "sonner"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"
import type { AutomergeUrl } from "@automerge/automerge-repo"

import { useAppContext } from "@/app-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export interface OpenChannelDialogProps {
  children: React.ReactNode
}

export function OpenChannelDialog({ children }: OpenChannelDialogProps) {
  const { workspace, service } = useAppContext()

  const [url, setUrl] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle>Open channel</DialogTitle>
            <DialogDescription>
              Paste the URL that another user gave you here
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleOpenChannel} className="px-6 pb-6">
          <div className="relative">
            <Label htmlFor="url" className="sr-only">
              URL
            </Label>
            <Input
              id="url"
              placeholder="automerge:2WN9h4Y3GDtdSJHWqvXozDYjSqrBHrhBxMkJBudaHbvDfU3WT3"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pr-10"
              autoFocus
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!url.trim() || isOpening}
              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              {isOpening ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
