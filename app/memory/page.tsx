"use client"

import * as React from "react"
import Link from "next/link"
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MemoryActions, MemoryDialog } from "@/components/memory-dialog"
import {
  listMemories,
  subscribeMemories,
  type Memory,
} from "@/components/memory-store"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"

const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" })

// Whether a memory has every word searched for.
function matches(memory: Memory, query: string) {
  const text = memory.text.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The text opens the memory to edit, and stretches over the whole row so the
// row opens it too. The row's own link and buttons sit above it.
const rowTrigger =
  "text-start outline-none after:absolute after:-inset-px after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
const row = "relative hover:bg-muted/50"

function MemoryRow({ memory }: { memory: Memory }) {
  const [editing, setEditing] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemContent className="min-w-0">
        <ItemTitle className="font-normal">
          <button
            type="button"
            className={rowTrigger}
            onClick={() => setEditing(true)}
          >
            {memory.text}
          </button>
        </ItemTitle>
        <ItemDescription>
          {memory.savedBy === "agent" ? "Saved by the agent" : "Saved by you"},{" "}
          {day.format(memory.createdAt)}
          {memory.chatId ? (
            <>
              {" · "}
              <Link
                href={`/${encodeURIComponent(memory.chatId)}`}
                className="relative z-10 rounded-sm underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open chat
              </Link>
            </>
          ) : null}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10">
        <MemoryActions
          memory={memory}
          editing={editing}
          onEditingChange={setEditing}
        />
      </ItemActions>
    </Item>
  )
}

// What the person and the agent have kept, from components/memory-store.ts,
// for the model to recall in later chats. It sits in the shell from the
// layout, in the chat's place.
export default function MemoryPage() {
  // Undefined until the store answers.
  const [memories, setMemories] = React.useState<Memory[]>()
  const [adding, setAdding] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)

  // Loaded, then again whenever they change, here or in another tab.
  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      listMemories().then((list) => {
        if (!cancelled) setMemories(list)
      })
    load()
    const stop = subscribeMemories(load)
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const shown = memories?.filter((memory) => matches(memory, query)) ?? []

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Memory</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-tight">Memory</h1>
              <p className="text-sm text-muted-foreground">
                What the agent can recall about you in any chat. Saved in this
                browser.
              </p>
            </div>
            <Button className="shrink-0" onClick={() => setAdding(true)}>
              <HugeiconsIcon aria-hidden icon={Add01Icon} />
              Add
            </Button>
          </div>
          {/* Only once there's something to search. */}
          {memories?.length ? (
            <InputGroup className="h-9 rounded-full">
              <InputGroupAddon>
                <HugeiconsIcon aria-hidden icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                ref={search}
                type="text"
                aria-label="Search memories"
                placeholder="Search memories"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault()
                    setQuery("")
                  }
                }}
              />
              {/* Disabled rather than hidden while empty, so the end of the
                  field doesn't shift. Clearing puts focus back in it. */}
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  disabled={!query}
                  onClick={clear}
                  className="rounded-full disabled:opacity-30"
                >
                  <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : null}
        </header>
        {memories === undefined ? null : memories.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Nothing saved yet. Ask the agent to remember something, or save a
            message from its toolbar.
          </p>
        ) : shown.length > 0 ? (
          <ItemGroup aria-label="Memories" className="flex flex-col">
            {shown.map((memory) => (
              <MemoryRow key={memory.id} memory={memory} />
            ))}
          </ItemGroup>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No memories match “{query.trim()}”.
          </p>
        )}
      </div>
      <MemoryDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}
