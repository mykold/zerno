import { SidebarProvider } from "@/components/ui/sidebar"

export interface LayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export default function Layout({ sidebar, children }: LayoutProps) {
  return (
    <SidebarProvider>
      {sidebar}
      <main className="w-full min-w-0 flex-1">{children}</main>
    </SidebarProvider>
  )
}
