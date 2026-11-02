"use client"

import * as React from "react"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import type { ToolEntry } from "@/lib/tools/catalog"

const code = "font-mono text-xs"

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </div>
  )
}

/**
 * A tool's details, from its row on the Tools page: what calls it and runs
 * it, which models get it, its files, and its suggestion.
 */
function ToolDetails({ tool }: { tool: ToolEntry }) {
  return (
    <Dialog>
      <DialogTrigger
        render={<TooltipIconButton tooltip="Details" side="left" />}
      >
        <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tool.name}</DialogTitle>
          <DialogDescription>{tool.summary}</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col gap-3">
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
      </DialogContent>
    </Dialog>
  )
}

export { ToolDetails }
