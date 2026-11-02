"use client"

import * as React from "react"
import {
  AiBrain01Icon,
  BubbleChatIcon,
  File01Icon,
  MoreHorizontalIcon,
  PaintBrush01Icon,
  ServerStack01Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DetailList, DetailRow } from "@/components/ui/detail-list"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import type { ToolEntry } from "@/lib/tools/catalog"

const code = "font-mono"

/**
 * A tool's details, from its row on the Tools page: what calls it and runs
 * it, which models get it, its files, and its suggestion.
 */
function ToolDetails({ tool }: { tool: ToolEntry }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <TooltipIconButton
            tooltip="Details"
            side="left"
            // Shows as the row is hovered, and always on touch, where nothing
            // hovers. It stays while focused or while its dialog is open.
            className="opacity-0 transition-[opacity,scale] group-focus-within/item:opacity-100 group-hover/item:opacity-100 data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
          />
        }
      >
        <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tool.name}</DialogTitle>
          <DialogDescription>{tool.summary}</DialogDescription>
        </DialogHeader>
        <DetailList title="Details">
          <DetailRow
            icon={SourceCodeIcon}
            label="Called"
            value={tool.calls.join(", ")}
            className={code}
          />
          <DetailRow
            icon={ServerStack01Icon}
            label="Runs in"
            value={tool.runs}
          />
          <DetailRow icon={AiBrain01Icon} label="Models" value={tool.models} />
          <DetailRow
            icon={File01Icon}
            label="Defined in"
            value={tool.definition}
            className={code}
          />
          <DetailRow
            icon={PaintBrush01Icon}
            label="Drawn by"
            value={tool.view}
            className={code}
          />
        </DetailList>
        <DetailList title="Suggestion">
          <DetailRow
            icon={BubbleChatIcon}
            label="In a new chat"
            value={`“${tool.suggestion}”`}
          />
        </DetailList>
      </DialogContent>
    </Dialog>
  )
}

export { ToolDetails }
