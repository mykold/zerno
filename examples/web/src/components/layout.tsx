import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export interface LayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export default function Layout({ sidebar, children }: LayoutProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        {sidebar}
        <main className="w-full min-w-0 flex-1">{children}</main>
      </SidebarProvider>
    </TooltipProvider>
  )
}
