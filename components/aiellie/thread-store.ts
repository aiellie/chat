import type { UIMessage } from "ai"

import type { ChatNavChat } from "@/components/nav-chats"

// Threads are kept in this browser's localStorage, so they survive a reload
// without an account. They don't follow the person to another browser.
const messagesKey = (id: string) => `aiellie:thread:${id}`

const NO_THREADS: ChatNavChat[] = []

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

// A list of chats under one key, read once and kept in step with other tabs.
function listStore(key: string) {
  let list: ChatNavChat[] | null = null
  const listeners = new Set<() => void>()

  const get = () => {
    list ??= read<ChatNavChat[]>(key) ?? NO_THREADS
    return list
  }

  const set = (update: (current: ChatNavChat[]) => ChatNavChat[]) => {
    list = update(get())
    write(key, list)
    listeners.forEach((listener) => listener())
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    // Another tab changed the list.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      list = null
      listener()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener("storage", onStorage)
    }
  }

  return { get, set, subscribe }
}

// A chat's name before it's given one: the first line of its first message,
// cut to fit a sidebar row.
function titleOf(text: string) {
  const line = text.trim().split("\n")[0]
  return line.length > 80 ? `${line.slice(0, 80)}…` : line
}

// The sidebar's chats.
const threads = listStore("aiellie:threads")
const getThreads = threads.get
const setThreads = threads.set
const subscribeThreads = threads.subscribe

// Quick chats are listed apart, in their own history, so asides don't crowd
// the sidebar. Their messages are kept the same way as a thread's.
const quickChats = listStore("aiellie:quick-chats")
const getQuickChats = quickChats.get
const setQuickChats = quickChats.set
const subscribeQuickChats = quickChats.subscribe

// The threads with a reply on its way, and when each was asked for. Kept in
// memory only: a reply doesn't outlive the page that asked for it.
const NO_REPLIES: ReadonlyMap<string, number> = new Map()
let replies = NO_REPLIES
const replyListeners = new Set<() => void>()

const getReplies = () => replies

function subscribeReplies(listener: () => void) {
  replyListeners.add(listener)
  return () => {
    replyListeners.delete(listener)
  }
}

/** Marks a thread as waiting on a reply since `since`, or as done with nothing. */
function setReplying(id: string, since?: number) {
  const next = new Map(replies)
  if (since === undefined) next.delete(id)
  else next.set(id, since)
  replies = next
  replyListeners.forEach((listener) => listener())
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
  NO_REPLIES,
  NO_THREADS,
  getQuickChats,
  getReplies,
  getThreads,
  loadMessages,
  removeMessages,
  saveMessages,
  setQuickChats,
  setReplying,
  setThreads,
  subscribeQuickChats,
  subscribeReplies,
  subscribeThreads,
  titleOf,
}
