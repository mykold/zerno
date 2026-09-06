import { useState } from "react"
import {
  SquarePenIcon,
  CopyIcon,
  Link2Icon,
  SunIcon,
  MoonIcon,
} from "lucide-react"
import { encodeContactCard } from "zerno-core"
import { useDocumentSelector } from "zerno-react"
import { toast } from "sonner"
import { ContactCard, uint8ArrayToHex } from "@automerge/automerge-repo-keyhive"

import {
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAppContext } from "@/app-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Channels } from "@/components/sidebar/channels"
import { identifierColor, shrinkIdentifier } from "@/utilities"
import { useTheme } from "@/components/theme-provider"
import { OpenChannelPopover } from "./open-channel-popover"
import { CreateChannelPopover } from "./create-channel-popover"

// MARK: IdentifierTooltip

function IdentifierTooltip({ id }: { id: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default truncate text-xs select-none group-data-[collapsible=icon]:hidden">
          {shrinkIdentifier(id)}
        </span>
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

// MARK: ThemeTooltip

function ThemeTooltip() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => void setTheme(theme === "dark" ? "light" : "dark")
  const ThemeIcon = theme === "dark" ? SunIcon : MoonIcon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ThemeIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-2 text-xs">
        Toggle theme
        <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          D
        </kbd>
      </TooltipContent>
    </Tooltip>
  )
}

// MARK: CopyContactCardTooltip

function CopyContactCardTooltip({ contactCard }: { contactCard: ContactCard }) {
  const onCopyContactCardClick = async () => {
    await navigator.clipboard.writeText(encodeContactCard(contactCard))
    toast.success("Copied to clipboard")
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onCopyContactCardClick}
        >
          <CopyIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Copy contact card
      </TooltipContent>
    </Tooltip>
  )
}

// MARK: AppSidebarFooter

function AppSidebarFooter() {
  const { service } = useAppContext()

  const [me] = useState(() => service.zerno.identity.me())
  const id = uint8ArrayToHex(me.id.toBytes())

  return (
    <SidebarFooter className="bg-sidebar-accent/50">
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-6 w-6">
            <AvatarFallback
              className="text-xs font-medium text-white"
              style={{ backgroundColor: identifierColor(id) }}
            >
              {id.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <IdentifierTooltip id={id} />
          <div className="ml-auto flex items-center gap-1 group-data-[collapsible=icon]:hidden">
            <ThemeTooltip />
            <CopyContactCardTooltip contactCard={me.contactCard} />
          </div>
        </div>
      </TooltipProvider>
    </SidebarFooter>
  )
}

// MARK: AppSidebar

export function AppSidebar() {
  const { workspace } = useAppContext()
  const channels = useDocumentSelector(workspace, (d) => d.channels)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-14 shrink-0 flex-row items-center gap-2 border-b px-2 group-data-[collapsible=icon]:justify-center">
        <p className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
          zerno-web
        </p>
        <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <CreateChannelPopover>
                <SidebarMenuButton className="hover:bg-sidebar-accent">
                  <SquarePenIcon />
                  Create channel
                </SidebarMenuButton>
              </CreateChannelPopover>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <OpenChannelPopover>
                <SidebarMenuButton className="hover:bg-sidebar-accent">
                  <Link2Icon />
                  Open channel
                </SidebarMenuButton>
              </OpenChannelPopover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <Channels urls={channels ?? []} />
      </SidebarContent>
      <AppSidebarFooter />
    </Sidebar>
  )
}
