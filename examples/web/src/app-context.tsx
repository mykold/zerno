import { createContext, useContext } from "react"
import type { AutomergeUrl, DocHandle } from "@automerge/react"

import type { Service, ZernoWorkspace } from "@/service"
import { useDocHandle } from "zerno-react"

interface AppContextValue {
  workspace: DocHandle<ZernoWorkspace>
  service: Service
}

const AppContext = createContext<AppContextValue | null>(null)

export interface AppContextProviderProps {
  workspaceUrl: AutomergeUrl
  service: Service
  children: React.ReactNode
}

export function AppContextProvider({
  workspaceUrl,
  service,
  children,
}: AppContextProviderProps) {
  const workspace = useDocHandle<ZernoWorkspace>(workspaceUrl, {
    suspense: true,
  })

  return (
    <AppContext.Provider value={{ workspace, service }}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}
