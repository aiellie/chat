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

type ElementState = { label: string; render: () => React.ReactNode }

/**
 * An element from the Elements page in every state it can be in, one under
 * the next, each labelled, with its file.
 */
function ElementDetails({
  name,
  summary,
  file,
  states,
  open,
  onOpenChange,
}: {
  name: string
  summary: string
  file: string
  states: ElementState[]
  /** Open, to open it from elsewhere on the row too, like its title. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <TooltipIconButton
            tooltip="States"
            side="left"
            // As on the Tools page: shows as the row is hovered, and always
            // on touch. It stays while focused or while its dialog is open.
            className="opacity-0 transition-[opacity,scale] group-focus-within/item:opacity-100 group-hover/item:opacity-100 data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
          />
        }
      >
        <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
      </DialogTrigger>
      {/* Wide enough for a card at the width a thread gives it, and scrolls
          on its own once the states run past the screen. */}
      <DialogContent className="max-h-[calc(100dvh-4rem)] gap-6 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {summary}. <span className="font-mono text-xs">{file}</span>
          </DialogDescription>
        </DialogHeader>
        {states.map((state) => (
          <section key={state.label} className="flex min-w-0 flex-col gap-2">
            <h3 className="text-xs text-muted-foreground">{state.label}</h3>
            {state.render()}
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}

export { ElementDetails }
