import { StrictMode, Suspense, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"

import "@automerge/automerge-subduction"
import { RepoContext } from "@automerge/react/slim"
import { Repo, type AutomergeUrl } from "@automerge/automerge-repo"
import { initializeAutomergeRepoKeyhive } from "@automerge/automerge-repo-keyhive"
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb"
import { Zerno } from "zerno-core"

import "./index.css"
import App from "./App"
import { SYNC_SERVER } from "./sync-server.ts"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AppContextProvider } from "@/app-context.tsx"
import { Toaster } from "@/components/ui/sonner.tsx"
import {
  Service,
  ChannelService,
  PhonebookService,
  WorkspaceService,
} from "./service"
import { ZernoProvider } from "zerno-react"
import { Loader2Icon } from "lucide-react"

async function createKeyhiveRepo() {
  const { syncServer, subductionWebsocketEndpoints } = SYNC_SERVER

  const { hive, repo } = await initializeAutomergeRepoKeyhive({
    createRepo: (config) => new Repo(config),
    storage: new IndexedDBStorageAdapter("keyhive"),
    peerIdSuffix: "zerno-web",
    automaticArchiveIngestion: true,
    cachingMode: "periodic",
    syncServer,
    repo: {
      storage: new IndexedDBStorageAdapter("repo"),
      subductionWebsocketEndpoints,
      enableRemoteHeadsGossiping: true,
    },
    shareConfigDebounceMs: 50,
  })

  return { hive, repo }
}

export interface AppProviderProps {
  children: React.ReactNode
  service: Service
  storageKey: string
}

export function AppProvider({
  children,
  service,
  storageKey,
}: AppProviderProps) {
  const [workspaceUrl, setWorkspaceUrl] = useState<AutomergeUrl | undefined>()

  useEffect(() => {
    async function initWorkspace() {
      let workspaceUrl = localStorage.getItem(storageKey) as AutomergeUrl | null
      if (!workspaceUrl) {
        const handle = await service.workspaces.create()
        workspaceUrl = handle.url
        localStorage.setItem(storageKey, workspaceUrl)
      }
      setWorkspaceUrl(workspaceUrl)
    }
    initWorkspace().catch(console.error)
  }, [service, storageKey])

  if (!workspaceUrl) return <Fallback text="Setting up your workspace..." />
  return (
    <AppContextProvider workspaceUrl={workspaceUrl} service={service}>
      {children}
    </AppContextProvider>
  )
}

function Fallback({ text }: { text: string }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="animate-pulse text-sm font-medium text-muted-foreground">
        {text}
      </p>
    </div>
  )
}

async function main() {
  const { hive, repo } = await createKeyhiveRepo()

  const zerno = new Zerno({
    repo,
    hive,
    resyncSubductionInterval: 2_000,
  })

  const phonebooks = new PhonebookService(zerno)
  const workspaces = new WorkspaceService(zerno, phonebooks)
  const channels = new ChannelService(zerno)
  const service = new Service(zerno, workspaces, channels, phonebooks)

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ZernoProvider zerno={zerno}>
        <RepoContext.Provider value={repo}>
          <Suspense fallback={<Fallback text="Syncing with network..." />}>
            <ThemeProvider defaultTheme="dark" storageKey="zerno-web.theme">
              <Toaster position="top-right" />
              <AppProvider
                service={service}
                storageKey="zerno-web.workspace-url"
              >
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/channels/:channel" element={<App />} />
                  </Routes>
                </BrowserRouter>
              </AppProvider>
            </ThemeProvider>
          </Suspense>
        </RepoContext.Provider>
      </ZernoProvider>
    </StrictMode>
  )
}

main().catch(console.error)
