"use client"

import * as React from "react"
import { AiBrain01Icon } from "@hugeicons/core-free-icons"
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
 * the reasoning. Open while the thinking comes in, so it can be watched, and
 * folded away once it's done; after that it's the reader's to open.
 */
function Reasoning({
  text,
  streaming = false,
  className,
}: {
  /** The reasoning so far. */
  text: string
  /** Whether more reasoning is still on its way. */
  streaming?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(streaming)
  const [seconds, setSeconds] = React.useState<number>()
  const [wasStreaming, setWasStreaming] = React.useState(streaming)

  if (streaming !== wasStreaming) {
    setWasStreaming(streaming)
    if (!streaming) setOpen(false)
  }

  // Counted while it's watched arriving, with a last count as it ends. One
  // loaded from history has no time to show.
  React.useEffect(() => {
    if (!streaming) return
    const started = Date.now()
    const count = () =>
      setSeconds(Math.max(1, Math.round((Date.now() - started) / 1000)))
    const timer = setInterval(count, 1000)
    return () => {
      clearInterval(timer)
      count()
    }
  }, [streaming])

  return (
    <Trace data-slot="reasoning" className={className}>
      <TraceCollapsible open={open} onOpenChange={setOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={streaming ? "running" : undefined}>
            <TraceIcon>
              <HugeiconsIcon icon={AiBrain01Icon} />
            </TraceIcon>
            <TraceTitle>{streaming ? "Thinking" : "Thought"}</TraceTitle>
            {seconds !== undefined ? (
              <TraceDescription>
                {streaming
                  ? `${seconds}s`
                  : `for ${seconds} ${seconds === 1 ? "second" : "seconds"}`}
              </TraceDescription>
            ) : null}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="text-sm">
          <Markdown>{text}</Markdown>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

export { Reasoning }
