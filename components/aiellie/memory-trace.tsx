"use client"

import * as React from "react"
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
  /** What a save was asked to keep. */
  text?: string
  /** How many memories a recall looked through. */
  searched?: number
  /** Whether what it found shares a word with the query, or is only the most recent. */
  matched?: boolean
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
  const input = record(part.input)
  const output = record(part.output)
  const text = (value: unknown) =>
    typeof value === "string" && value ? value : undefined
  return {
    kind,
    status:
      part.state === "output-error"
        ? "error"
        : part.state === "output-available"
          ? "done"
          : "running",
    query: text(input?.query),
    text: text(input?.text),
    searched:
      typeof output?.searched === "number" ? output.searched : undefined,
    matched: typeof output?.matched === "boolean" ? output.matched : undefined,
    memories: Array.isArray(output?.memories)
      ? output.memories.flatMap((each) => itemOf(each) ?? [])
      : undefined,
    memory: itemOf(output?.memory),
    error: part.errorText,
  }
}

const count = (n: number) => `${n} ${n === 1 ? "memory" : "memories"}`

// One step of how the call went: what it was, then what it did.
function Step({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </>
  )
}

// The call as the model made it: the tool's name and what it passed.
function Call({
  name,
  arg,
  value,
}: {
  name: string
  arg: string
  value?: string
}) {
  return (
    <code className="font-mono text-xs break-words text-muted-foreground">
      <span className="text-foreground">{name}</span>({arg}:{" "}
      {value === undefined ? "…" : JSON.stringify(value)})
    </code>
  )
}

/**
 * A reply's use of memory, as a trace line: shimmering while it recalls or
 * saves, then how many memories it recalled, opening onto them, or what it
 * saved, with Undo. A saved memory that's no longer kept says so.
 */
function MemoryTrace({
  kind,
  status,
  query,
  text,
  searched,
  matched,
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
            ? matched === false
              ? `Recalled ${memories.length} recent ${memories.length === 1 ? "memory" : "memories"}`
              : `Recalled ${count(memories.length)}`
            : searched === 0
              ? "No memories to recall"
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
          <TraceCollapsibleTrigger disabled={running || status === "stopped"}>
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
          {/* How the call went, step by step, then what it gave back. */}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
            <Step label="Call">
              {kind === "save" ? (
                <Call name="save_memory" arg="text" value={text} />
              ) : (
                <Call name="recall_memory" arg="query" value={query} />
              )}
            </Step>
            {kind === "recall" ? (
              <Step label="Search">
                {searched === undefined
                  ? `Found ${count(memories.length)}`
                  : searched === 0
                    ? "Nothing kept yet to look through"
                    : matched === false
                      ? `Looked through ${count(searched)}. None share a word with “${query ?? ""}”, so the most recent went back instead`
                      : `Looked through ${count(searched)}. ${memories.length} ${memories.length === 1 ? "shares" : "share"} a word with “${query ?? ""}”`}
              </Step>
            ) : (
              <Step label="Kept">
                {removed ? "Kept, then removed" : "Added as a new memory"}
              </Step>
            )}
            {shown.length > 0 ? (
              <Step label={kind === "save" ? "Memory" : "Sent back"}>
                <ul className="flex flex-col gap-1.5">
                  {shown.map((item) => (
                    <li
                      key={item.id}
                      className={removed ? "line-through" : undefined}
                    >
                      {item.text}
                    </li>
                  ))}
                </ul>
              </Step>
            ) : null}
          </dl>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

export { isMemoryPart, memoryCallOf, MemoryTrace }
export type { MemoryCall, MemoryItem, MemoryPart }
