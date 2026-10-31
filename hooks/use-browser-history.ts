import * as React from "react"

// The Navigation API isn't in TypeScript's DOM types yet.
type Navigation = EventTarget & { canGoBack: boolean; canGoForward: boolean }

function getNavigation() {
  return (window as Window & { navigation?: Navigation }).navigation
}

function subscribe(onChange: () => void) {
  const navigation = getNavigation()
  navigation?.addEventListener("currententrychange", onChange)
  return () => navigation?.removeEventListener("currententrychange", onChange)
}

// Packed into one number so the snapshot compares by value. A browser without
// the Navigation API can't say where it is in the history, so both stay on.
function getSnapshot() {
  const navigation = getNavigation()
  if (!navigation) return 3
  return (navigation.canGoBack ? 1 : 0) | (navigation.canGoForward ? 2 : 0)
}

const back = () => window.history.back()
const forward = () => window.history.forward()

// Where the tab is in its history, and ⌘[ / ⌘] to move through it.
export function useBrowserHistory() {
  const state = React.useSyncExternalStore(subscribe, getSnapshot, () => 0)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return
      if (event.key !== "[" && event.key !== "]") return
      event.preventDefault()
      if (event.key === "[") back()
      else forward()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return {
    canGoBack: (state & 1) !== 0,
    canGoForward: (state & 2) !== 0,
    back,
    forward,
  }
}
