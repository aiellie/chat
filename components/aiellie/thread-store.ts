import type { UIMessage } from "ai"

import type { ChatNavChat } from "@/components/nav-chats"

// Threads are kept in this browser's localStorage, so they survive a reload
// without an account. They don't follow the person to another browser.
const THREADS_KEY = "aiellie:threads"
const messagesKey = (id: string) => `aiellie:thread:${id}`

const NO_THREADS: ChatNavChat[] = []
let threads: ChatNavChat[] | null = null
const listeners = new Set<() => void>()

function read<T>(key: string): T | undefined {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : undefined
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Full or blocked storage keeps the thread for this visit only.
  }
}

function getThreads() {
  threads ??= read<ChatNavChat[]>(THREADS_KEY) ?? NO_THREADS
  return threads
}

function setThreads(update: (current: ChatNavChat[]) => ChatNavChat[]) {
  threads = update(getThreads())
  write(THREADS_KEY, threads)
  listeners.forEach((listener) => listener())
}

function subscribeThreads(listener: () => void) {
  listeners.add(listener)
  // Another tab changed the list.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THREADS_KEY) return
    threads = null
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

const loadMessages = (id: string) => read<UIMessage[]>(messagesKey(id))
// Files are kept by name only: their contents would fill the few megabytes
// localStorage allows within a handful of pictures.
const saveMessages = (id: string, messages: UIMessage[]) =>
  write(
    messagesKey(id),
    messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) =>
        part.type === "file" && part.url.startsWith("data:")
          ? { ...part, url: "" }
          : part
      ),
    }))
  )
const removeMessages = (id: string) => {
  try {
    localStorage.removeItem(messagesKey(id))
  } catch {}
}

export {
  NO_THREADS,
  getThreads,
  loadMessages,
  removeMessages,
  saveMessages,
  setThreads,
  subscribeThreads,
}
