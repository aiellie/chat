// Memories: facts the person wants kept across chats, saved by them or by the
// agent when asked. Kept in this browser's localStorage for now, as projects
// are, so they survive a reload without an account. They don't follow the
// person to another browser.
//
// Pages and the chat only ever call the functions below, never localStorage,
// and every one returns a promise, as a database call would. Moving memories
// to a backend means rewriting the inside of this file, and nothing that
// uses it.

type Memory = {
  id: string
  text: string
  /** Who saved it: the person, from a message or the Memory page, or the agent. */
  savedBy: "you" | "agent"
  /** The chat it was saved from, if any. */
  chatId?: string
  createdAt: number
  updatedAt: number
}

/** What saving a memory takes. */
type MemoryInput = {
  text: string
  savedBy: Memory["savedBy"]
  chatId?: string
}

const KEY = "aiellie:memories"

const listeners = new Set<() => void>()

function read(): Memory[] {
  try {
    const value = localStorage.getItem(KEY)
    return value ? (JSON.parse(value) as Memory[]) : []
  } catch {
    return []
  }
}

function write(memories: Memory[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(memories))
  } catch {
    // Full or blocked storage keeps the change for this visit only.
  }
  listeners.forEach((listener) => listener())
}

const byRecent = (a: Memory, b: Memory) => b.updatedAt - a.updatedAt

/** Every memory, the most recently changed first. */
async function listMemories(): Promise<Memory[]> {
  return read().sort(byRecent)
}

async function createMemory(input: MemoryInput): Promise<Memory> {
  const now = Date.now()
  const memory: Memory = {
    id: crypto.randomUUID(),
    text: input.text.trim(),
    savedBy: input.savedBy,
    chatId: input.chatId,
    createdAt: now,
    updatedAt: now,
  }
  write([memory, ...read()])
  return memory
}

/** The memory as changed, or undefined if there's no such memory. */
async function updateMemory(
  id: string,
  text: string
): Promise<Memory | undefined> {
  let updated: Memory | undefined
  write(
    read().map((memory) =>
      memory.id === id
        ? (updated = { ...memory, text: text.trim(), updatedAt: Date.now() })
        : memory
    )
  )
  return updated
}

async function deleteMemory(id: string): Promise<void> {
  write(read().filter((memory) => memory.id !== id))
}

const words = (text: string) =>
  text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []

/**
 * The memories that share a word with the query, those sharing the most
 * first, then the most recent. An empty query gives the most recent. A
 * backend would rank by meaning instead; the callers wouldn't change.
 */
async function searchMemories(query: string, limit = 10): Promise<Memory[]> {
  const terms = new Set(words(query))
  const memories = read().sort(byRecent)
  if (!terms.size) return memories.slice(0, limit)
  return memories
    .map((memory) => ({
      memory,
      score: new Set(words(memory.text).filter((word) => terms.has(word)))
        .size,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ memory }) => memory)
}

/**
 * Calls back whenever the memories change, here or in another tab. A backend
 * would call it from its own change feed. Returns the unsubscribe.
 */
function subscribeMemories(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export {
  createMemory,
  deleteMemory,
  listMemories,
  searchMemories,
  subscribeMemories,
  updateMemory,
}
export type { Memory, MemoryInput }
