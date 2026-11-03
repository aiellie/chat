"use client"

import { Bookmark02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
import { Button } from "@/components/ui/button"

// The model's memory tools, by the names the chat route gives them. Kept
// here as well as with the tools, so this part needs nothing of the app's.
const RECALL_PART = "tool-recall_memory"
const SAVE_PART = "tool-save_memory"

/** A memory as the line shows it. */
type MemoryItem = { id: string; text: string }

type MemoryCall = {
  /** Recalling what's kept, or saving something new. */
  kind: "recall" | "save"
  /** Still at work, done, failed, or stopped before it had an answer. */
  status: "running" | "done" | "error" | "stopped"
  /** What a recall looked for. */
  query?: string
  /** What a recall found. */
  memories?: MemoryItem[]
  /** What a save kept. */
  memory?: MemoryItem
  /** Why it failed. */
  error?: string
}

type MemoryPart = {
  type: string
  state: string
  input?: unknown
  output?: unknown
  errorText?: string
}

const record = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined

const itemOf = (value: unknown): MemoryItem | undefined => {
  const entry = record(value)
  return typeof entry?.id === "string" && typeof entry.text === "string"
    ? { id: entry.id, text: entry.text }
    : undefined
}

/** Whether a message part is a memory tool's. */
const isMemoryPart = (part: { type: string }) =>
  part.type === RECALL_PART || part.type === SAVE_PART

/** A memory tool's part as the line draws it. */
function memoryCallOf(part: MemoryPart): MemoryCall {
  const kind = part.type === SAVE_PART ? "save" : "recall"
  const query = record(part.input)?.query
  const output = record(part.output)
  return {
    kind,
    status:
      part.state === "output-error"
        ? "error"
        : part.state === "output-available"
          ? "done"
          : "running",
    query: typeof query === "string" && query ? query : undefined,
    memories: Array.isArray(output?.memories)
      ? output.memories.flatMap((each) => itemOf(each) ?? [])
      : undefined,
    memory: itemOf(output?.memory),
    error: part.errorText,
  }
}

const count = (n: number) => `${n} ${n === 1 ? "memory" : "memories"}`

/**
 * A reply's use of memory, as a trace line: shimmering while it recalls or
 * saves, then how many memories it recalled, opening onto them, or what it
 * saved, with Undo. A saved memory that's no longer kept says so.
 */
function MemoryTrace({
  kind,
  status,
  query,
  memories = [],
  memory,
  error,
  removed = false,
  onUndo,
  className,
}: MemoryCall & {
  /** Whether the memory saved here has since been removed. */
  removed?: boolean
  /** Removes the memory saved here. Without it, there's no Undo. */
  onUndo?: () => void
  className?: string
}) {
  const running = status === "running"

  if (status === "error")
    return (
      <Trace data-slot="memory-trace" className={className}>
        <TraceLine status="error">
          <TraceIcon>
            <HugeiconsIcon icon={Bookmark02Icon} />
          </TraceIcon>
          <TraceTitle>
            {kind === "save"
              ? "Couldn't save to memory"
              : "Couldn't recall memories"}
          </TraceTitle>
          {error ? (
            <TraceDescription className="text-destructive/70">
              {error}
            </TraceDescription>
          ) : null}
        </TraceLine>
      </Trace>
    )

  const title =
    status === "stopped"
      ? kind === "save"
        ? "Stopped before saving"
        : "Stopped before recalling"
      : kind === "save"
        ? running
          ? "Saving to memory"
          : removed
            ? "Removed from memory"
            : "Saved to memory"
        : running
          ? query
            ? `Recalling memories about “${query}”`
            : "Recalling memories"
          : memories.length > 0
            ? `Recalled ${count(memories.length)}`
            : "No memories matched"
  const shown = kind === "save" ? (memory ? [memory] : []) : memories

  return (
    <Trace
      data-slot="memory-trace"
      aria-busy={running || undefined}
      className={className}
    >
      <TraceCollapsible>
        <div className="flex min-w-0 items-center gap-2">
          <TraceCollapsibleTrigger disabled={running || shown.length === 0}>
            <TraceLine status={running ? "running" : undefined}>
              <TraceIcon>
                <HugeiconsIcon icon={Bookmark02Icon} />
              </TraceIcon>
              <TraceTitle>{title}</TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          {kind === "save" &&
          status === "done" &&
          !removed &&
          memory &&
          onUndo ? (
            <Button variant="ghost" size="xs" onClick={onUndo}>
              Undo
            </Button>
          ) : null}
        </div>
        <TraceCollapsibleContent>
          <ul className="flex flex-col gap-1.5">
            {shown.map((item) => (
              <li
                key={item.id}
                className={removed ? "text-sm line-through" : "text-sm"}
              >
                {item.text}
              </li>
            ))}
          </ul>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

export { isMemoryPart, memoryCallOf, MemoryTrace }
export type { MemoryCall, MemoryItem, MemoryPart }
