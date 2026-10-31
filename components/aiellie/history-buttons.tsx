"use client"

import * as React from "react"
import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

function HistoryButtons({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  backShortcut = "⌘[",
  forwardShortcut = "⌘]",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
  /** Shown in the tooltip. The keys themselves are yours to listen for. */
  backShortcut?: string
  forwardShortcut?: string
}) {
  return (
    <div
      data-slot="history-buttons"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    >
      <TooltipIconButton
        tooltip="Back"
        shortcut={backShortcut}
        disabled={!canGoBack}
        onClick={onBack}
        className="size-7"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} className="rtl:-scale-x-100" />
      </TooltipIconButton>
      <TooltipIconButton
        tooltip="Forward"
        shortcut={forwardShortcut}
        disabled={!canGoForward}
        onClick={onForward}
        className="size-7"
      >
        <HugeiconsIcon icon={ArrowRight02Icon} className="rtl:-scale-x-100" />
      </TooltipIconButton>
    </div>
  )
}

export { HistoryButtons }
