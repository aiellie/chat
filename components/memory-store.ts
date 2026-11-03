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

/** What an edited Memory doc adds, rewrites and removes. */
type MemoryChanges = {
  create: string[]
  update: { id: string; text: string }[]
  remove: string[]
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

/**
 * Applies what an edited Memory doc changed, from lib/memory-document.ts,
 * in one write, so the chat and other tabs hear of it once. New memories
 * are the person's, added in the order given. An empty rewrite removes.
 */
async function applyMemoryChanges(changes: MemoryChanges): Promise<void> {
  const now = Date.now()
  const texts = new Map(changes.update.map(({ id, text }) => [id, text.trim()]))
  const removed = new Set(changes.remove)
  let changed = false
  const kept = read().flatMap((memory): Memory[] => {
    const text = texts.get(memory.id)
    if (removed.has(memory.id) || text === "") {
      changed = true
      return []
    }
    if (text === undefined || text === memory.text) return [memory]
    changed = true
    return [{ ...memory, text, updatedAt: now }]
  })
  const created = changes.create
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index): Memory => ({
      id: crypto.randomUUID(),
      text,
      savedBy: "you",
      // A step apart, so they keep their order in the doc.
      createdAt: now + index,
      updatedAt: now + index,
    }))
  if (!changed && created.length === 0) return
  write([...created.reverse(), ...kept])
}

const words = (text: string) =>
  text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []

// Whether two words are the same but for an ending: "live" and "lives".
const alike = (a: string, b: string) =>
  a === b ||
  (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)))

/**
 * The memories that share a word with the query, those sharing the most
 * first, then the most recent. When none do, or the query is empty, the
 * most recent, so the model can judge for itself: a few words often miss
 * the one memory that answers. A backend would rank by meaning instead;
 * the callers wouldn't change.
 */
async function searchMemories(query: string, limit = 10): Promise<Memory[]> {
  const terms = [...new Set(words(query))]
  const memories = read().sort(byRecent)
  const matched = memories
    .map((memory) => {
      const own = words(memory.text)
      return {
        memory,
        score: terms.filter((term) => own.some((word) => alike(word, term)))
          .length,
      }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ memory }) => memory)
  return (matched.length > 0 ? matched : memories).slice(0, limit)
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
  applyMemoryChanges,
  createMemory,
  deleteMemory,
  listMemories,
  searchMemories,
  subscribeMemories,
  updateMemory,
}
export type { Memory, MemoryChanges, MemoryInput }
