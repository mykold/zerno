import type { AutomergeUrl } from "@automerge/automerge-repo"
import { useParams } from "react-router"

export function useSelectedGroupUrl(): AutomergeUrl {
  const { group } = useParams()
  return group as AutomergeUrl
}
