import { useState } from "react"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { toast } from "sonner"
import { ContactCard, Power, usePower, useDocHandle } from "zerno-react"
import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js"

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppContext } from "@/app-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ZernoChannel } from "@/service"

const POWERS = [
  { value: "relay", level: 0 },
  { value: "read", level: 1 },
  { value: "edit", level: 2 },
  { value: "admin", level: 3 },
]

export interface GrantChannelSheetProps {
  url: AutomergeUrl
  open: boolean
  setOpen: (v: boolean) => void
}

export function GrantChannelSheet({
  url,
  open,
  setOpen,
}: GrantChannelSheetProps) {
  const { service } = useAppContext()
  const channel = useDocHandle<ZernoChannel>(url, { suspense: true })

  type TabType = "contact-card" | "address-book"
  const [tab, setTab] = useState<TabType>("contact-card")

  const [power, setPower] = useState<string | undefined>()
  const [contactCard, setContactCard] = useState("")

  const myPower = usePower(url)

  const handleGrantChannel = async () => {
    switch (tab) {
      case "contact-card": {
        try {
          if (!power) {
            toast.error("Select a power")
            break
          }

          await service.workspaces.grantChannel({
            channel,
            contactCard: ContactCard.fromBytes(hexToUint8Array(contactCard)),
            power: Power.fromString(power),
          })
        } catch (e) {
          const message = (e as Error).message
          toast.error("Could not grant power", { description: message })
          break
        }

        toast.success("Channel successfully granted")
        setOpen(false)
        break
      }

      case "address-book": {
        toast.warning("Not implemented yet")
        break
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>Grant channel power</SheetTitle>
          <SheetDescription>
            Select a user and choose the power they should have over
            this document.
          </SheetDescription>
        </SheetHeader>

        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabType)}>
              <TabsList className="w-full">
                <TabsTrigger value="contact-card">By contact card</TabsTrigger>
                <TabsTrigger value="address-book">By address book</TabsTrigger>
              </TabsList>

              <TabsContent value="contact-card" className="mt-3">
                <div className="space-y-2">
                  <Label htmlFor="contact-card">
                    Paste a member's contact card
                  </Label>

                  <p className="text-sm text-muted-foreground">
                    The other user must share their contact card with you first.
                    They can copy it from the bottom-left corner of the app.
                    Paste the copied contact card here.
                  </p>

                  <Input
                    id="contact-card"
                    value={contactCard}
                    onChange={(e) => setContactCard(e.target.value)}
                    placeholder="AAAAU3siQWRkIjp7InBheWxvYWQiOnsic2hhcmVfa2V5IjpbMSwzMiwwXX0sImlzc3VlciI6WzEsMzIsMzJdLCJzaWduYXR1cmUiOlsxLDY0LDY0XX19NAMDb5S53gMoTXKX..."
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="address-book"
                className="mt-3 flex flex-col gap-2"
              >
                {/* TODO: Use `AddressBook` */}
                <Label>Not implemented yet</Label>

                {/* {([] as DocMember[]).map((member) => {
                  const id = shrinkIdentifier(member.id)
                  const color = identifierColor(member.id)

                  return (
                    <Button variant="outline" className="justify-start">
                      <CircleIcon fill={color} stroke={color} />
                      {id}
                    </Button>
                  )
                })} */}
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="channel-power">Power</Label>

              <p className="text-sm text-muted-foreground">
                Higher levels include all permissions from lower levels.
              </p>
            </div>

            <Select value={power} onValueChange={setPower}>
              <SelectTrigger className="w-full max-w-48">
                <SelectValue placeholder="Select power" />
              </SelectTrigger>

              <SelectContent position="popper">
                {POWERS.filter(
                  (power) => myPower && myPower.level >= power.level
                ).map((power) => (
                  <SelectItem value={power.value}>{power.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button onClick={handleGrantChannel}>Save changes</Button>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
