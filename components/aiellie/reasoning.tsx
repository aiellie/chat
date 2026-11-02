"use client"

import * as React from "react"
import { Brain02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Markdown } from "@/components/aiellie/markdown"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/aiellie/trace"

/**
 * What a model thought before it replied, as a trace line that opens onto
 * the reasoning. Open while the thinking comes in, written out word by word
 * so it can be watched, and folded away once its last word is on screen;
 * after that it's the reader's to open.
 */
function Reasoning({
  text,
  streaming = false,
  duration,
  onThinkingChange,
  className,
}: {
  /** The reasoning so far. */
  text: string
  /** Whether more reasoning is still on its way. */
  streaming?: boolean
  /** How long the model thought, in seconds, as saved with the reply. */
  duration?: number
  /**
   * Called as it starts and stops thinking, which lasts until its words are
   * written out, so a reply can wait for them.
   */
  onThinkingChange?: (thinking: boolean) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(streaming)
  // Whether every word so far is on screen. Thinking that lands in one burst
  // is still being written out after the model has moved on.
  const [revealed, setRevealed] = React.useState(!streaming)
  const [counted, setCounted] = React.useState<number>()
  // Nothing to open onto until the first words arrive.
  const shown = open && text !== ""
  // Thinking while it comes in, and while it's written out where it's watched.
  const thinking = streaming || (shown && !revealed)
  const [wasThinking, setWasThinking] = React.useState(thinking)

  if (thinking !== wasThinking) {
    setWasThinking(thinking)
    if (!thinking) setOpen(false)
  }

  const onThinkingChangeRef = React.useRef(onThinkingChange)

  React.useEffect(() => {
    onThinkingChangeRef.current = onThinkingChange
  })

  // Stopping includes going away mid-thought.
  React.useEffect(() => {
    if (!thinking) return
    onThinkingChangeRef.current?.(true)
    return () => onThinkingChangeRef.current?.(false)
  }, [thinking])

  // Counted live while it's watched arriving. Once done, the time saved with
  // the reply wins, so it reads the same after a reload as it did live.
  const seconds = thinking ? counted : (duration ?? counted)

  React.useEffect(() => {
    if (!streaming) return
    const started = Date.now()
    const count = () =>
      setCounted(Math.max(1, Math.round((Date.now() - started) / 1000)))
    const timer = setInterval(count, 1000)
    return () => {
      clearInterval(timer)
      count()
    }
  }, [streaming])

  return (
    <Trace data-slot="reasoning" className={className}>
      <TraceCollapsible
        open={shown}
        onOpenChange={(next) => {
          setOpen(next)
          // Opened while it still comes in, it's written out again from the
          // start; otherwise it's shown whole.
          setRevealed(!(next && streaming))
        }}
      >
        <TraceCollapsibleTrigger>
          <TraceLine status={thinking ? "running" : undefined}>
            <TraceIcon>
              <HugeiconsIcon icon={Brain02Icon} />
            </TraceIcon>
            <TraceTitle>{thinking ? "Thinking" : "Thought"}</TraceTitle>
            {seconds !== undefined ? (
              <TraceDescription>
                {thinking
                  ? `${seconds}s`
                  : `for ${seconds} ${seconds === 1 ? "second" : "seconds"}`}
              </TraceDescription>
            ) : null}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="text-sm">
          <Markdown
            streaming={streaming}
            revealInitial={thinking}
            onRevealed={() => setRevealed(true)}
          >
            {text}
          </Markdown>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

export { Reasoning }
