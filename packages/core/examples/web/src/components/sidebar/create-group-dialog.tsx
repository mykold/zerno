import { useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"

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
import { useAppContext } from "@/app-context"

export interface CreateGroupDialogProps {
  children: React.ReactNode
}

export function CreateGroupDialog({ children }: CreateGroupDialogProps) {
  const navigate = useNavigate()
  const { workspace, service } = useAppContext()

  const [name, setName] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName || isCreating) return

    setIsCreating(true)
    try {
      const handle = await service.workspaces.createGroup({
        workspace,
        name: trimmedName,
      })

      setIsOpen(false)
      setName("")
      navigate(`/groups/${handle.url}`)
    } catch (error) {
      console.error("Failed to create group:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>Choose a name for the group</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleCreateGroup} className="px-6 pb-6">
          <div className="relative">
            <Label htmlFor="name" className="sr-only">
              Name
            </Label>
            <Input
              id="name"
              placeholder="General"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pr-10"
              autoFocus
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!name.trim() || isCreating}
              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              {isCreating ? (
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
