import { toast } from "sonner"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import { useSelectedChannelUrl } from "@/hooks/use-selected-channel-url"
import { isValidAutomergeUrl } from "@automerge/react/slim"

import { App } from "./App"

function RootRoute() {
  return <Navigate to="/" replace />
}

function ChannelRoute() {
  const selectedChannelUrl = useSelectedChannelUrl()

  if (!isValidAutomergeUrl(selectedChannelUrl)) {
    toast.error("Invalid Automerge URL", { id: "invalid-automerge-url" })
    return <RootRoute />
  }

  return <App />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/channels/:channel" element={<ChannelRoute />} />
        <Route path="*" element={<RootRoute />} />
      </Routes>
    </BrowserRouter>
  )
}
