import { useSyncExternalStore } from "react"

const COARSE_POINTER = "(pointer: coarse)"

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(COARSE_POINTER)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsTouch() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE_POINTER).matches
  )
}
