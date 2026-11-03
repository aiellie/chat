"use client"

import * as React from "react"
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  Image01Icon,
  Link01Icon,
  Note01Icon,
  Search01Icon,
  SourceCodeIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MemoryDoc } from "@/components/memory-doc"
import { listMemories, subscribeMemories } from "@/components/memory-store"
import {
  StashActions,
  StashEditor,
  StashItemDialog,
  StashTile,
  summaryOf,
} from "@/components/stash-items"
import {
  addFiles,
  listStash,
  subscribeStash,
  type StashInput,
  type StashItem,
} from "@/components/stash-store"
import { ToolMark } from "@/components/tool-mark"
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
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"

// Whether an item has every word searched for, in its name, what it holds
// or where it goes.
function matches(item: StashItem, query: string) {
  const text = [item.name, item.body ?? "", item.url ?? "", item.language ?? ""]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The title opens the item, and stretches over the whole row so the row
// opens it too. The row's own buttons sit above it.
const rowTrigger =
  "text-start outline-none after:absolute after:-inset-px after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
const row = "relative hover:bg-muted/50"

function StashRow({ item }: { item: StashItem }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemMedia variant="icon">
        <StashTile item={item} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <button
            type="button"
            className={`${rowTrigger} truncate`}
            onClick={() => setOpen(true)}
          >
            {item.name}
          </button>
        </ItemTitle>
        <ItemDescription className="truncate">
          {summaryOf(item)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10">
        <StashActions item={item} onOpen={() => setOpen(true)} />
      </ItemActions>
      <StashItemDialog item={item} open={open} onOpenChange={setOpen} />
    </Item>
  )
}

// The Memory doc, always first: what the AI remembers, one memory a line.
// It's the memories themselves, from components/memory-store.ts, rather
// than an item of the stash, so it can't be renamed or deleted.
function MemoryRow({ count }: { count?: number }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemMedia variant="icon">
        <ToolMark
          id="memory"
          className="size-9 rounded-lg"
          iconClassName="size-5"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <button
            type="button"
            className={`${rowTrigger} truncate`}
            onClick={() => setOpen(true)}
          >
            Memory
          </button>
        </ItemTitle>
        <ItemDescription className="truncate tabular-nums">
          {count === undefined
            ? "Doc"
            : `Doc · ${count} ${count === 1 ? "memory" : "memories"}`}
        </ItemDescription>
      </ItemContent>
      <MemoryDoc open={open} onOpenChange={setOpen} />
    </Item>
  )
}

// Anything the person keeps, from components/stash-store.ts: files, images,
// pages, links and code. It sits in the shell from the layout, in the chat's
// place.
export default function StashdPage() {
  // Undefined until the store answers.
  const [items, setItems] = React.useState<StashItem[]>()
  const [memoryCount, setMemoryCount] = React.useState<number>()
  const [writing, setWriting] = React.useState<StashInput["kind"]>()
  // Kept while the editor folds away, so its title doesn't change mid-close.
  const [lastKind, setLastKind] = React.useState<StashInput["kind"]>("page")
  const [error, setError] = React.useState<string>()
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)
  const files = React.useRef<HTMLInputElement>(null)
  const images = React.useRef<HTMLInputElement>(null)

  // Loaded, then again whenever it changes, here or in another tab.
  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      listStash()
        .then((list) => {
          if (!cancelled) setItems(list)
        })
        .catch(() => {
          if (!cancelled) setItems([])
        })
    load()
    const stop = subscribeStash(load)
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  React.useEffect(() => {
    const load = () => listMemories().then((all) => setMemoryCount(all.length))
    load()
    return subscribeMemories(load)
  }, [])

  const upload = async (list: FileList | null) => {
    if (!list?.length) return
    setError(undefined)
    try {
      await addFiles([...list])
    } catch {
      setError(
        "Those files couldn't be saved. The browser may be out of storage space."
      )
    }
  }

  const write = (kind: StashInput["kind"]) => {
    setLastKind(kind)
    setWriting(kind)
  }

  const shown = items?.filter((item) => matches(item, query)) ?? []
  const memoryShown = matches({ name: "Memory doc" } as StashItem, query)

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Stashd</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-tight">Stashd</h1>
              <p className="text-sm text-muted-foreground">
                Files, images, pages, links and code, saved in this browser.
              </p>
            </div>
            <Menu>
              <MenuTrigger
                render={
                  <Button className="group/create shrink-0">
                    <HugeiconsIcon aria-hidden icon={Add01Icon} />
                    Create
                    <HugeiconsIcon
                      aria-hidden
                      icon={ArrowDown01Icon}
                      className="transition-transform duration-150 group-data-popup-open/create:rotate-180 motion-reduce:transition-none"
                    />
                  </Button>
                }
              />
              <MenuContent side="bottom" align="end">
                <MenuItem onClick={() => files.current?.click()}>
                  <HugeiconsIcon aria-hidden icon={Upload01Icon} />
                  Upload files
                </MenuItem>
                <MenuItem onClick={() => images.current?.click()}>
                  <HugeiconsIcon aria-hidden icon={Image01Icon} />
                  Image
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={() => write("page")}>
                  <HugeiconsIcon aria-hidden icon={Note01Icon} />
                  Page
                </MenuItem>
                <MenuItem onClick={() => write("link")}>
                  <HugeiconsIcon aria-hidden icon={Link01Icon} />
                  Link
                </MenuItem>
                <MenuItem onClick={() => write("code")}>
                  <HugeiconsIcon aria-hidden icon={SourceCodeIcon} />
                  Code snippet
                </MenuItem>
              </MenuContent>
            </Menu>
            {/* Picked from the menu. Reset after each pick, so the same file
                can be picked again. */}
            <input
              ref={files}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                upload(event.target.files)
                event.target.value = ""
              }}
            />
            <input
              ref={images}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                upload(event.target.files)
                event.target.value = ""
              }}
            />
          </div>
          {/* Once the stash has loaded. */}
          {items !== undefined ? (
            <InputGroup className="h-9 rounded-full">
              <InputGroupAddon>
                <HugeiconsIcon aria-hidden icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                ref={search}
                type="text"
                aria-label="Search Stashd"
                placeholder="Search Stashd"
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
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </header>
        {items === undefined ? null : memoryShown || shown.length > 0 ? (
          <ItemGroup
            aria-label="Stashd"
            className="grid gap-x-6 sm:grid-cols-2"
          >
            {memoryShown ? <MemoryRow count={memoryCount} /> : null}
            {shown.map((item) => (
              <StashRow key={item.id} item={item} />
            ))}
          </ItemGroup>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Nothing matches “{query.trim()}”.
          </p>
        )}
      </div>
      <StashEditor
        open={writing !== undefined}
        onOpenChange={(open) => {
          if (!open) setWriting(undefined)
        }}
        kind={writing ?? lastKind}
      />
    </div>
  )
}
