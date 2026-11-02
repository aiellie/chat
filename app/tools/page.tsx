"use client"

import * as React from "react"
import {
  Cancel01Icon,
  GlobalSearchIcon,
  LeftToRightListNumberIcon,
  Search01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { cn } from "cn"

import { ToolDetails } from "@/components/tool-details"
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
import { TOOLS, type ToolEntry } from "@/lib/tools/catalog"

// Each tool's mark, as its part in the thread draws it where it has one.
const ICONS: Record<string, IconSvgElement> = {
  "web-search": GlobalSearchIcon,
  plan: LeftToRightListNumberIcon,
}

// The tile behind that mark: a pale fill, and the icon's ink.
const COLORS: Record<string, string> = {
  "web-search": "bg-blue-50 text-blue-500",
  plan: "bg-amber-50 text-amber-500",
}

// Whether a tool has every word searched for, in its name, what it does, or
// the names the model calls it by.
function matches(tool: ToolEntry, query: string) {
  const text = [tool.name, tool.summary, ...tool.calls].join(" ").toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The tools the model can use, from lib/tools/catalog.ts, to keep track of.
// It sits in the shell from the layout, in the chat's place.
export default function ToolsPage() {
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)
  const shown = TOOLS.filter((tool) => matches(tool, query))

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Tools</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-medium tracking-tight">Tools</h1>
            <p className="text-sm text-muted-foreground">
              The model has{" "}
              {TOOLS.length === 1 ? "this" : `these ${TOOLS.length}`} on every
              reply and uses one only when the reply needs it.
            </p>
          </div>
          <InputGroup className="h-9 rounded-full">
            <InputGroupAddon>
              <HugeiconsIcon aria-hidden icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              ref={search}
              type="text"
              aria-label="Search tools"
              placeholder="Search tools"
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
          <ItemGroup aria-label="Tools" className="grid gap-x-6 sm:grid-cols-2">
            {shown.map((tool) => (
              <Item key={tool.id} role="listitem" variant="outline">
                <ItemMedia
                  variant="icon"
                  className={cn(
                    "size-9 rounded-lg",
                    COLORS[tool.id] ?? "border border-border/60"
                  )}
                >
                  <HugeiconsIcon
                    aria-hidden
                    icon={ICONS[tool.id] ?? Wrench01Icon}
                    className="size-5"
                  />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{tool.name}</ItemTitle>
                  <ItemDescription>{tool.summary}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ToolDetails tool={tool} />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No tools match “{query.trim()}”.
          </p>
        )}
      </div>
    </div>
  )
}
