"use client"

import * as React from "react"
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ELEMENTS, type ElementEntry } from "@/app/elements/demos"
import { ElementDetails } from "@/components/element-details"
import { Status, StatusLabel } from "@/components/ui/status"
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

// Whether an element has every word searched for, in its name, what it is,
// or its file.
function matches(element: ElementEntry, query: string) {
  const text = [element.name, element.summary, element.file]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The title opens the row's dialog, and stretches over the whole row so the
// row opens it too. The row's own buttons sit above it.
const rowTrigger =
  "text-start outline-none after:absolute after:-inset-px after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
const row = "relative hover:bg-muted/50"

function ElementRow({ element }: { element: ElementEntry }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemMedia
        variant="icon"
        className="size-9 rounded-lg border border-border/60"
      >
        <HugeiconsIcon aria-hidden icon={element.icon} className="size-5" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-2">
        <div className="flex min-w-0 flex-col">
          <ItemTitle>
            <button
              type="button"
              className={rowTrigger}
              onClick={() => setOpen(true)}
            >
              {element.name}
            </button>
          </ItemTitle>
          <ItemDescription>{element.summary}</ItemDescription>
        </div>
        <Status variant="muted">
          <StatusLabel className="tabular-nums">
            {element.states.length}{" "}
            {element.states.length === 1 ? "state" : "states"}
          </StatusLabel>
        </Status>
      </ItemContent>
      <ItemActions className="relative z-10 self-start">
        <ElementDetails
          name={element.name}
          summary={element.summary}
          file={element.file}
          states={element.states}
          open={open}
          onOpenChange={setOpen}
        />
      </ItemActions>
    </Item>
  )
}

// The elements going in the @aiellie registry, from ./demos.tsx, each open
// to every state it can be in, to check them without the model. It sits in
// the shell from the layout, in the chat's place.
export default function ElementsPage() {
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)
  const shown = ELEMENTS.filter((element) => matches(element, query))

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Elements</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-medium tracking-tight">Elements</h1>
            <p className="text-sm text-muted-foreground">
              The parts in{" "}
              <span className="font-mono text-xs">components/aiellie</span> that
              go in the registry. Open one to see it in every state.
            </p>
          </div>
          <InputGroup className="h-9 rounded-full">
            <InputGroupAddon>
              <HugeiconsIcon aria-hidden icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              ref={search}
              type="text"
              aria-label="Search elements"
              placeholder="Search elements"
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
        </header>
        {shown.length > 0 ? (
          <ItemGroup
            aria-label="Elements"
            className="grid gap-x-6 sm:grid-cols-2"
          >
            {shown.map((element) => (
              <ElementRow key={element.id} element={element} />
            ))}
          </ItemGroup>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No elements match “{query.trim()}”.
          </p>
        )}
      </div>
    </div>
  )
}
