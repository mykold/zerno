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
import type { ZernoGroup } from "@/service"
import { useAppContext } from "@/app-context"

export interface EditGroupSheetProps {
  url: AutomergeUrl
  open: boolean
  setOpen: (v: boolean) => void
}

export function EditGroupSheet({ url, open, setOpen }: EditGroupSheetProps) {
  const { service } = useAppContext()

  const group = useDocHandle<ZernoGroup>(url, { suspense: true })
  const groupName = useDocumentSelector(group, (g) => g.name)

  const [name, setName] = useState(groupName)
  const handleGroupEdit = async () => {
    try {
      await service.workspaces.editGroup({
        group,
        name,
      })
    } catch (e) {
      const message = (e as Error).message
      toast.error(message)
      return
    }
    toast.success("Group successfully updated")
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Edit group name</SheetTitle>
          <SheetDescription>Click outside to close.</SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor="group-name">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={groupName}
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleGroupEdit}>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
