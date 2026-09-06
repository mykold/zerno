import { useState } from "react"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { toast } from "sonner"
import { useDocHandle, useDocumentSelector } from "zerno-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ZernoChannel } from "@/service"
import { useAppContext } from "@/app-context"

export interface EditChannelSheetProps {
  url: AutomergeUrl
  open: boolean
  setOpen: (v: boolean) => void
}

export function EditChannelSheet({
  url,
  open,
  setOpen,
}: EditChannelSheetProps) {
  const { service } = useAppContext()

  const channel = useDocHandle<ZernoChannel>(url, { suspense: true })
  const channelName = useDocumentSelector(channel, (c) => c.name)

  const [name, setName] = useState(channelName)
  const handleChannelEdit = async () => {
    try {
      await service.workspaces.editChannel({
        channel,
        name,
      })
    } catch (e) {
      const message = (e as Error).message
      toast.error(message)
      return
    }
    toast.success("Channel successfully updated")
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Edit channel name</SheetTitle>
          <SheetDescription>Click outside to close.</SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={channelName}
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleChannelEdit}>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
