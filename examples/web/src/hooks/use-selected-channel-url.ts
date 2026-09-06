import type { AutomergeUrl } from "@automerge/automerge-repo"
import { useParams } from "react-router"

export function useSelectedChannelUrl(): AutomergeUrl {
  const { channel } = useParams()
  return channel as AutomergeUrl
}
