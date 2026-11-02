import * as React from "react"
import { AudioWave01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

// Marks in the thread for a voice chat: where one starts and ends, and each
// turn in it that was said aloud rather than typed. They take the live ink
// only while their chat is going, as the orb does, and are quiet after.

/**
 * Plain caption text where a voice chat starts, saying which realtime model
 * it was with, or where it ends.
 */
function VoiceDivider({
  edge,
  model,
  live = false,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  edge: "start" | "end"
  model?: string
  /** Whether this chat is still going. */
  live?: boolean
}) {
  const label = edge === "start" ? "Voice chat" : "Voice chat ended"

  return (
    <div
      role="separator"
      aria-label={edge === "start" && model ? `${label} with ${model}` : label}
      data-slot="voice-divider"
      data-edge={edge}
      className={cn(
        "flex items-center justify-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <HugeiconsIcon
        aria-hidden
        icon={AudioWave01Icon}
        strokeWidth={2}
        className={cn("size-3.5", live && "text-live")}
      />
      <span aria-hidden>
        {label}
        {edge === "start" && model ? ` · ${model}` : null}
      </span>
    </div>
  )
}

/** Goes before a turn's words, to show they were said aloud. */
function SpokenMark({
  live = false,
  className,
}: {
  /** Whether the chat it was said in is still going. */
  live?: boolean
  className?: string
}) {
  return (
    <span
      data-slot="spoken-mark"
      className={cn(live ? "text-live" : "text-muted-foreground", className)}
    >
      <HugeiconsIcon
        aria-hidden
        icon={AudioWave01Icon}
        strokeWidth={2}
        className="size-4"
      />
      <span className="sr-only">Said aloud: </span>
    </span>
  )
}

export { SpokenMark, VoiceDivider }
