"use client"

import * as React from "react"
import {
  GlobalSearchIcon,
  LeftToRightListNumberIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  Item,
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

const code = "font-mono text-xs"

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    // Side by side where there's room, label over value on a phone.
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-muted-foreground sm:w-24">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </div>
  )
}

function Tool({ tool }: { tool: ToolEntry }) {
  return (
    <Item variant="outline" role="listitem">
      <ItemMedia variant="icon">
        <HugeiconsIcon aria-hidden icon={ICONS[tool.id] ?? Wrench01Icon} />
      </ItemMedia>
      {/* The details sit under the description, lined up with the title. */}
      <ItemContent className="min-w-0 gap-3">
        <div className="flex flex-col gap-1">
          {/* A heading, as each tool's name, for moving between them. */}
          <ItemTitle role="heading" aria-level={2}>
            {tool.name}
          </ItemTitle>
          {/* Whole, never clamped: it's the point of the entry. */}
          <ItemDescription className="line-clamp-none">
            {tool.summary}
          </ItemDescription>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          <Detail label="Called">
            <span className={code}>{tool.calls.join(", ")}</span>
          </Detail>
          <Detail label="Runs in">{tool.runs}</Detail>
          <Detail label="Models">{tool.models}</Detail>
          <Detail label="Defined in">
            <span className={code}>{tool.definition}</span>
          </Detail>
          {tool.view ? (
            <Detail label="Drawn by">
              <span className={code}>{tool.view}</span>
            </Detail>
          ) : null}
          <Detail label="Suggestion">“{tool.suggestion}”</Detail>
        </dl>
      </ItemContent>
    </Item>
  )
}

/** The tools the model can use, from lib/tools/catalog.ts, to keep track of. */
function ToolsPage() {
  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Tools</h1>
          <p className="text-sm text-muted-foreground">
            The model has{" "}
            {TOOLS.length === 1 ? "this" : `these ${TOOLS.length}`} on every
            reply and uses one only when the reply needs it.
          </p>
        </header>
        <ItemGroup aria-label="Tools">
          {TOOLS.map((tool) => (
            <Tool key={tool.id} tool={tool} />
          ))}
        </ItemGroup>
      </div>
    </div>
  )
}

export { ToolsPage }
