"use client"

import * as React from "react"
import type { UIMessage } from "ai"

import {
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@/components/aiellie/message-scroller"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Mark = { id: string; mine: boolean; preview: string; width: number }

// What a message says, as plain words: without the markdown around them or
// its line breaks. A message of files alone is named by them.
function previewOf(message: UIMessage) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .replace(/^ {0,3}```.*$/gm, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*|__|`+/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (text) return text
  return message.parts
    .flatMap((part) =>
      part.type === "file" ? [part.filename ?? "A file"] : []
    )
    .join(", ")
}

// Longer messages draw longer bars, on a log scale so one long reply doesn't
// dwarf the rest: from 8px for a word to 24px for a long read.
const widthOf = (length: number) =>
  8 + Math.round(16 * Math.min(1, Math.log10(length + 1) / 4))

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * The thread at a glance, down its side: a bar for each message, longer for
 * a longer one, darker while it's on screen. Hovering one previews it, and
 * pressing one scrolls to it. It shows only where there's room beside the
 * thread and more of it than fits, so it goes inside the thread's scroller.
 */
function ThreadTranscript({
  messages,
  className,
}: {
  messages: UIMessage[]
  className?: string
}) {
  const { scrollToMessage } = useMessageScroller()
  const { visibleMessageIds } = useMessageScrollerVisibility()
  const scrollable = useMessageScrollerScrollable()
  const listRef = React.useRef<HTMLDivElement>(null)

  const marks = messages.flatMap<Mark>((message) => {
    const preview = previewOf(message)
    return preview
      ? [
          {
            id: message.id,
            mine: message.role === "user",
            preview,
            width: widthOf(preview.length),
          },
        ]
      : []
  })
  const visible = new Set(visibleMessageIds)
  // The topmost message on screen: where the thread is, for the keyboard and
  // for keeping its bar in view.
  const current = marks.find((mark) => visible.has(mark.id))?.id ?? marks[0]?.id

  // A long thread has more bars than fit, so the list scrolls to keep the
  // ones on screen in view. Only the list moves, never the page around it.
  React.useEffect(() => {
    const list = listRef.current
    const bar = current
      ? list?.querySelector<HTMLElement>(`[data-id="${CSS.escape(current)}"]`)
      : null
    if (!list || !bar) return
    const above = bar.offsetTop < list.scrollTop
    const below =
      bar.offsetTop + bar.offsetHeight > list.scrollTop + list.clientHeight
    if (above || below) list.scrollTop = bar.offsetTop - list.clientHeight / 3
  }, [current])

  // Nothing to move through when the whole thread fits.
  if (marks.length < 2 || (!scrollable.start && !scrollable.end)) return null

  // One stop in the tab order, on where the thread is; the arrows move
  // between bars from there.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const bars = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-id]"),
    ]
    const at = bars.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      event.key === "ArrowDown"
        ? at + 1
        : event.key === "ArrowUp"
          ? at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? bars.length - 1
              : undefined
    if (next === undefined || at < 0) return
    event.preventDefault()
    bars[Math.max(0, Math.min(bars.length - 1, next))]?.focus()
  }

  return (
    <nav
      aria-label="Thread transcript"
      className={cn(
        "absolute end-3 top-1/2 z-10 hidden -translate-y-1/2 @min-[54rem]:flex",
        className
      )}
    >
      <div
        ref={listRef}
        onKeyDown={onKeyDown}
        className="flex max-h-[min(60vh,24rem)] [scrollbar-width:none] flex-col items-end overflow-y-auto py-1 [&::-webkit-scrollbar]:hidden"
      >
        {marks.map((mark) => (
          <Tooltip key={mark.id}>
            <TooltipTrigger
              render={<button type="button" />}
              data-id={mark.id}
              data-visible={visible.has(mark.id) || undefined}
              tabIndex={mark.id === current ? 0 : -1}
              aria-label={`${mark.mine ? "Your message" : "Reply"}: ${mark.preview.slice(0, 80)}`}
              aria-current={mark.id === current ? "location" : undefined}
              onClick={() =>
                scrollToMessage(mark.id, {
                  align: "start",
                  behavior: reducedMotion() ? "auto" : "smooth",
                })
              }
              className="group/bar flex h-2.5 w-8 shrink-0 items-center justify-end pe-1 outline-none"
            >
              <span
                style={{ width: mark.width }}
                className="h-0.5 rounded-full bg-muted-foreground/30 transition-[background-color,height] duration-150 group-hover/bar:h-1 group-hover/bar:bg-foreground/70 group-focus-visible/bar:h-1 group-focus-visible/bar:bg-foreground group-data-visible/bar:bg-foreground/80 motion-reduce:transition-none"
              />
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="max-w-64 flex-col items-start gap-0.5"
            >
              <span className="opacity-60">{mark.mine ? "You" : "Ellie"}</span>
              <span className="line-clamp-3">{mark.preview}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </nav>
  )
}

export { ThreadTranscript }
