"use client"

import * as React from "react"
import { Streamdown } from "streamdown"
import "streamdown/styles.css"

import { useWordReveal } from "@/components/aiellie/stream-text"
import { cn } from "@/lib/utils"

// Each word with the whitespace before it, so joining a prefix of them gives
// the reply up to that word, newlines and all.
const WORDS = /\s*\S+/g

// The same fade StreamText gives a word, played by Streamdown on the words
// it hasn't drawn before. The pace is ours, so it adds no stagger of its own.
const FADE = {
  animation: "blurIn",
  duration: 280,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  stagger: 0,
} as const

/**
 * A reply as Markdown, written out word by word at StreamText's pace.
 * Streamdown closes what the words so far leave open, like a `**` or a code
 * fence, so half a reply still reads as formatted text.
 */
function StreamMarkdown({
  text,
  streaming = false,
  pace = 16,
  revealInitial = false,
  className,
}: {
  /** The reply so far. Each value should carry on from the one before. */
  text: string
  /** Whether more is still on its way. */
  streaming?: boolean
  /** Words a second, until the stream's own rate is known. */
  pace?: number
  /** Write out the text it mounts with too, instead of showing it at once. */
  revealInitial?: boolean
  className?: string
}) {
  const words = React.useMemo(() => text.match(WORDS) ?? [], [text])
  // While more is coming, a last word with nothing after it may be half a word.
  const ready = streaming && /\S$/.test(text) ? words.length - 1 : words.length
  const { shown } = useWordReveal(text, ready, {
    streaming,
    pace,
    revealInitial,
  })
  const visible = Math.min(shown, words.length)
  const busy = streaming || visible < words.length
  // Settled for the reply's life: switching once it finishes would redraw it.
  const [mode] = React.useState<"static" | "streaming">(
    streaming || revealInitial ? "streaming" : "static"
  )

  return (
    <Streamdown
      mode={mode}
      isAnimating={busy}
      animated={FADE}
      caret="block"
      className={cn("min-w-0", className)}
    >
      {words.slice(0, visible).join("")}
    </Streamdown>
  )
}

export { StreamMarkdown }
