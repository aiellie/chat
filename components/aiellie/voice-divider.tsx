import * as React from "react"
import { AudioWave01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

// Marks in the thread for a voice chat, in the live colour: where one starts
// and ends, and each turn in it that was said aloud rather than typed.

/**
 * A rule across the thread where a voice chat starts, saying which realtime
 * model it was with, or where it ends.
 */
function VoiceDivider({
  edge,
  model,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  edge: "start" | "end"
  model?: string
}) {
  const label = edge === "start" ? "Voice chat" : "Voice chat ended"

  return (
    <div
      role="separator"
      aria-label={edge === "start" && model ? `${label} with ${model}` : label}
      data-slot="voice-divider"
      data-edge={edge}
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span aria-hidden className="flex shrink-0 items-center gap-1.5">
        <HugeiconsIcon
          icon={AudioWave01Icon}
          strokeWidth={2}
          className={cn("size-3.5", edge === "start" && "text-live")}
        />
        {label}
        {edge === "start" && model ? (
          <span className="text-muted-foreground/70">· {model}</span>
        ) : null}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

/** Goes before a turn's words, to show they were said aloud. */
function SpokenMark({ className }: { className?: string }) {
  return (
    <span data-slot="spoken-mark" className={cn("text-live", className)}>
      <HugeiconsIcon
        aria-hidden
        icon={AudioWave01Icon}
        strokeWidth={2}
        className="size-3.5"
      />
      <span className="sr-only">Said aloud: </span>
    </span>
  )
}

export { SpokenMark, VoiceDivider }
