// Stashd: anything the person keeps, from files and images to pages, links
// and code. Kept in this browser's IndexedDB for now, which holds files as
// they are, where localStorage holds only a few megabytes of text. Items
// don't follow the person to another browser.
//
// Pages only ever call the functions below, and every one returns a
// promise, as a database call would. Moving the stash to a backend means
// rewriting the inside of this file, and nothing that uses it.

type StashKind = "file" | "page" | "link" | "code"

type StashItem = {
  id: string
  kind: StashKind
  name: string
  createdAt: number
  updatedAt: number
  /** A file's contents, type and size in bytes. An image is a file. */
  blob?: Blob
  mediaType?: string
  size?: number
  /** A page's Markdown, or a snippet's code. */
  body?: string
  /** A snippet's language, as written: "tsx", "python". */
  language?: string
  /** Where a link goes. */
  url?: string
}

/** What a person writes to create or edit a page, link or snippet. */
type StashInput = {
  kind: Exclude<StashKind, "file">
  name: string
  body?: string
  language?: string
  url?: string
}

const DATABASE = "aiellie-stash"
const STORE = "items"

let opening: Promise<IDBDatabase> | undefined

function database() {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return opening
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const request = action(transaction.objectStore(STORE))
    transaction.oncomplete = () => resolve(request.result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

// Changes here, and in other tabs through the channel.
const listeners = new Set<() => void>()
const channel =
  typeof BroadcastChannel === "undefined"
    ? undefined
    : new BroadcastChannel("aiellie:stash")

function changed() {
  listeners.forEach((listener) => listener())
  channel?.postMessage("changed")
}

/** Everything stashed, the most recently changed first. */
async function listStash(): Promise<StashItem[]> {
  const items = await run<StashItem[]>("readonly", (store) => store.getAll())
  return items.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Stashes files as they are. An image is a file whose type says so. */
async function addFiles(files: File[]): Promise<StashItem[]> {
  const now = Date.now()
  const items = files.map((file, index): StashItem => ({
    id: crypto.randomUUID(),
    kind: "file",
    name: file.name,
    blob: file,
    mediaType: file.type || undefined,
    size: file.size,
    // In the order picked, the first on top.
    createdAt: now - index,
    updatedAt: now - index,
  }))
  const db = await database()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite")
    for (const item of items) transaction.objectStore(STORE).put(item)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
  changed()
  return items
}

const clean = (input: StashInput) => ({
  kind: input.kind,
  name: input.name.trim(),
  body: input.body || undefined,
  language: input.language?.trim() || undefined,
  url: input.url?.trim() || undefined,
})

async function createStashItem(input: StashInput): Promise<StashItem> {
  const now = Date.now()
  const item: StashItem = {
    id: crypto.randomUUID(),
    ...clean(input),
    createdAt: now,
    updatedAt: now,
  }
  await run("readwrite", (store) => store.put(item))
  changed()
  return item
}

/** Edits a page, link or snippet, or renames a file. */
async function updateStashItem(
  id: string,
  patch: Partial<StashInput>
): Promise<StashItem | undefined> {
  const item = await run<StashItem | undefined>("readonly", (store) =>
    store.get(id)
  )
  if (!item) return undefined
  const updated: StashItem = {
    ...item,
    ...(item.kind === "file"
      ? { name: patch.name?.trim() || item.name }
      : clean({ ...item, ...patch } as StashInput)),
    kind: item.kind,
    updatedAt: Date.now(),
  }
  await run("readwrite", (store) => store.put(updated))
  changed()
  return updated
}

async function deleteStashItem(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id))
  changed()
}

/**
 * Calls back whenever the stash changes, here or in another tab. A backend
 * would call it from its own change feed. Returns the unsubscribe.
 */
function subscribeStash(listener: () => void) {
  listeners.add(listener)
  channel?.addEventListener("message", listener)
  return () => {
    listeners.delete(listener)
    channel?.removeEventListener("message", listener)
  }
}

export {
  addFiles,
  createStashItem,
  deleteStashItem,
  listStash,
  subscribeStash,
  updateStashItem,
}
export type { StashInput, StashItem, StashKind }
