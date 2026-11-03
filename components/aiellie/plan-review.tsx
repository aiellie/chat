"use client"

import * as React from "react"
import {
  Add01Icon,
  Cancel01Icon,
  GripVerticalIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status"
import { Textarea } from "@/components/ui/textarea"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { cn } from "@/lib/utils"

/** The tool a model calls to propose a plan, unless the app names another. */
const PLAN_TOOL = "propose_plan"

type PlanStep = { title: string; detail?: string }

type Plan = { title?: string; steps: PlanStep[] }

/** How many steps the person changed, and how, before answering. */
type PlanEdits = {
  moved: number
  rewritten: number
  added: number
  removed: number
}

/** What the person made of a plan, sent back to the model as the tool's output. */
type PlanDecision =
  | { decision: "approved"; plan: Plan; edited: boolean; edits?: PlanEdits }
  /** Sent back with a note on what to change, for the model to plan again. */
  | { decision: "revised"; plan: Plan; note: string; edits?: PlanEdits }
  | { decision: "dismissed" }

const record = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined

const textOf = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined

/**
 * A plan from a tool call's input, which is partial while it streams: a step
 * shows once its title has begun.
 */
function planOf(input: unknown): Plan {
  const entry = record(input)
  const steps = Array.isArray(entry?.steps) ? entry.steps : []
  return {
    title: textOf(entry?.title),
    steps: steps.flatMap((step) => {
      const title = textOf(record(step)?.title)
      return title ? [{ title, detail: textOf(record(step)?.detail) }] : []
    }),
  }
}

const count = (value: unknown) =>
  typeof value === "number" && value > 0 ? Math.floor(value) : 0

function editsOf(value: unknown): PlanEdits | undefined {
  const entry = record(value)
  if (!entry) return undefined
  return {
    moved: count(entry.moved),
    rewritten: count(entry.rewritten),
    added: count(entry.added),
    removed: count(entry.removed),
  }
}

function decisionOf(output: unknown): PlanDecision | undefined {
  const entry = record(output)
  if (entry?.decision === "dismissed") return { decision: "dismissed" }
  if (entry?.decision === "approved")
    return {
      decision: "approved",
      plan: planOf(entry.plan),
      edited: entry.edited === true,
      edits: editsOf(entry.edits),
    }
  if (entry?.decision === "revised")
    return {
      decision: "revised",
      plan: planOf(entry.plan),
      note: textOf(entry.note) ?? "",
      edits: editsOf(entry.edits),
    }
  return undefined
}

type PlanPart = {
  type: string
  toolCallId: string
  state: string
  input?: unknown
  output?: unknown
  errorText?: string
}

/** A plan a reply proposed, and where it stands. */
type PlanCall = {
  /** Its place among the message's parts, for text written around it. */
  index: number
  toolCallId: string
  plan: Plan
  /** Still being written. */
  writing: boolean
  /** Written in full and not yet answered. */
  open: boolean
  decision?: PlanDecision
  /** Why the call failed, if it did. */
  error?: string
}

/** The plans a reply proposed, in the order it proposed them. */
function plansIn(message: UIMessage, tool = PLAN_TOOL): PlanCall[] {
  return message.parts.flatMap((part, index) => {
    if (part.type !== `tool-${tool}`) return []
    const call = part as PlanPart
    return [
      {
        index,
        toolCallId: call.toolCallId,
        plan: planOf(call.input),
        writing: call.state === "input-streaming",
        open: call.state === "input-available",
        decision:
          call.state === "output-available"
            ? decisionOf(call.output)
            : undefined,
        error: call.state === "output-error" ? call.errorText : undefined,
      },
    ]
  })
}

/**
 * For `useChat`'s `sendAutomaticallyWhen`: true once the person has approved
 * a plan the last reply proposed, so the model goes on to carry it out, or
 * sent it back with a note, so the model plans again.
 */
function planApproved({ messages }: { messages: UIMessage[] }) {
  const message = messages.at(-1)
  if (message?.role !== "assistant") return false
  // Only the reply's latest step: once the model carries on, it starts another.
  const step = message.parts.slice(
    message.parts.findLastIndex((part) => part.type === "step-start") + 1
  )
  return (
    !step.some((part) => part.type === "text" && part.state === "streaming") &&
    plansIn({ ...message, parts: step }).some(
      (call) =>
        call.decision?.decision === "approved" ||
        call.decision?.decision === "revised"
    )
  )
}

/** A plan as Markdown, to copy or read aloud with the words around it. */
function planMarkdown(plan: Plan) {
  const steps = plan.steps.map(
    (step, index) =>
      `${index + 1}. ${step.title}${step.detail ? ` — ${step.detail}` : ""}`
  )
  return [plan.title ? `**${plan.title}**` : "", ...steps]
    .filter(Boolean)
    .join("\n")
}

type DraftStep = {
  id: string
  title: string
  detail: string
  /** Removed, but still listed, struck through, until the plan is answered. */
  removed?: boolean
  /** Moved by the person, so it, not the steps it passed, reads as moved. */
  moved?: boolean
}
type Draft = { title: string; steps: DraftStep[] }

let lastId = 0
const newStepId = () => `step-${++lastId}`

const draftOf = (plan: Plan): Draft => ({
  title: plan.title ?? "",
  // Keyed by place until edited, which is the order the model wrote them in.
  steps: plan.steps.map((step, index) => ({
    id: `proposed-${index}`,
    title: step.title,
    detail: step.detail ?? "",
  })),
})

/** The draft as it goes to the model: trimmed, without removed or empty steps. */
function planFrom(draft: Draft): Plan {
  return {
    title: draft.title.trim() || undefined,
    steps: draft.steps.flatMap((step) => {
      const title = step.title.trim()
      const detail = step.detail.trim()
      return title && !step.removed
        ? [detail ? { title, detail } : { title }]
        : []
    }),
  }
}

/**
 * Indices of the longest increasing run in `values`. Between equally long
 * runs it keeps the one with fewer steps the person moved, so the step they
 * dragged reads as moved rather than every step it passed.
 */
function longestIncreasing(values: number[], touched: boolean[]) {
  type Run = { length: number; untouched: number; last: number }
  const better = (a: Run, b: Run) =>
    a.length !== b.length
      ? a.length > b.length
      : a.untouched !== b.untouched
        ? a.untouched > b.untouched
        : a.last < b.last
  const runs: Run[] = values.map((value, i) => ({
    length: 1,
    untouched: touched[i] ? 0 : 1,
    last: value,
  }))
  const previous = values.map(() => -1)
  let best = -1
  for (let i = 0; i < values.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (values[j] >= values[i]) continue
      const candidate: Run = {
        length: runs[j].length + 1,
        untouched: runs[j].untouched + (touched[i] ? 0 : 1),
        last: values[i],
      }
      if (previous[i] === -1 || better(candidate, runs[i])) {
        runs[i] = candidate
        previous[i] = j
      }
    }
    if (best === -1 || better(runs[i], runs[best])) best = i
  }
  const kept = new Set<number>()
  for (let i = best; i !== -1; i = previous[i]) kept.add(i)
  return kept
}

type Tag = "new" | "edited" | "moved" | "removed"

/**
 * What the person changed, against what was proposed: a count of each kind,
 * and each step's tag. A step counts as moved only if it left the longest
 * run still in the proposed order.
 */
function changesOf(proposed: Draft, draft: Draft) {
  const original = new Map(
    proposed.steps.map((step, i) => [step.id, { step, i }])
  )
  const tags = new Map<string, Tag>()
  const kept = draft.steps.filter((step) => !step.removed)
  const keptOriginal = kept.filter((step) => original.has(step.id))
  const inOrder = longestIncreasing(
    keptOriginal.map((step) => original.get(step.id)!.i),
    keptOriginal.map((step) => !!step.moved)
  )
  const edits: PlanEdits = { moved: 0, rewritten: 0, added: 0, removed: 0 }
  keptOriginal.forEach((step, index) => {
    if (!inOrder.has(index)) {
      edits.moved += 1
      tags.set(step.id, "moved")
    }
  })
  for (const step of keptOriginal) {
    const was = original.get(step.id)!.step
    if (
      step.title.trim() !== was.title.trim() ||
      step.detail.trim() !== was.detail.trim()
    ) {
      edits.rewritten += 1
      tags.set(step.id, "edited")
    }
  }
  for (const step of kept)
    if (!original.has(step.id) && step.title.trim()) {
      edits.added += 1
      tags.set(step.id, "new")
    }
  for (const step of draft.steps)
    if (step.removed && original.has(step.id)) {
      edits.removed += 1
      tags.set(step.id, "removed")
    }
  // A new title counts as a rewrite, without a tag of its own.
  if (draft.title.trim() !== proposed.title.trim()) edits.rewritten += 1
  return { edits, tags }
}

const editCount = (edits: PlanEdits) =>
  edits.moved + edits.rewritten + edits.added + edits.removed

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** "1 moved · 2 added", in a fixed order, leaving out what didn't happen. */
const editSummary = (edits: PlanEdits) =>
  (
    [
      [edits.moved, "moved"],
      [edits.rewritten, "rewritten"],
      [edits.added, "added"],
      [edits.removed, "removed"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(" · ")

// Read as it's needed, in the browser only.
const reducedMotion = () =>
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches

// The ease-out curve every arrival and answer uses, and the time a row takes
// to reach its new place.
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"
const GLIDE = 280

type Drag = {
  id: string
  row: HTMLElement
  startY: number
  startTop: number
  lastY: number
}

// A field and the plain text it becomes share one box, so nothing shifts as
// a plan turns editable or settles. Its border shows on hover and focus.
// Inputs under 16px make iOS zoom in, so a phone gets the larger size.
const box =
  "rounded-sm border border-transparent px-1.5 py-0.5 text-base sm:text-sm"

function PlanField({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    // Bleeds by its padding, so its words line up with the text around it.
    <div className="-mx-1.5 flex">
      <textarea
        rows={1}
        spellCheck
        className={cn(
          box,
          "field-sizing-content w-full min-w-0 resize-none bg-transparent wrap-break-word transition-colors duration-80 outline-none placeholder:text-muted-foreground/60 hover:border-input focus-visible:border-ring motion-reduce:transition-none",
          className
        )}
        {...props}
      />
    </div>
  )
}

function PlanText({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div className="-mx-1.5 flex">
      <p
        className={cn(box, "w-full min-w-0 wrap-break-word", className)}
        {...props}
      />
    </div>
  )
}

// Shows on the row's hover or focus, and always on touch, where nothing
// hovers.
const onHover =
  "opacity-0 group-focus-within/step:opacity-100 group-hover/step:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"

/**
 * A plan a model proposed, for the person to review before it's carried
 * out. With `onReview` they can reword, reorder, add and remove steps, then
 * approve the plan as they left it, send it back with a note on what to
 * change, or dismiss it. Each step says how it was changed, and removed
 * steps stay listed, struck through, until the plan is answered. Without
 * `onReview`, or once answered, it's read-only. While `writing`, its steps
 * fill in as they come.
 *
 * In a step: Enter adds one after it, Backspace in an empty one removes it,
 * Alt+↑ and Alt+↓ move it, and ⌘ or Ctrl+Enter approves. A step's number is
 * its handle: drag it, or focus it and use ↑, ↓, Home and End.
 */
function PlanReview({
  plan,
  decision,
  writing = false,
  error,
  onReview,
  disabled = false,
  className,
}: {
  /** The plan as proposed. */
  plan: Plan
  /** How the person answered, once they have. */
  decision?: PlanDecision
  /** Whether the plan is still being written. */
  writing?: boolean
  /** Why the plan couldn't be shown, if it failed. */
  error?: string
  /** Makes it editable until answered. */
  onReview?: (decision: PlanDecision) => void
  /** Holds the answer back, as while another reply is on its way. */
  disabled?: boolean
  className?: string
}) {
  const [draft, setDraft] = React.useState<Draft | null>(null)
  // The step being worked on, which shows its details field even when empty.
  const [active, setActive] = React.useState<string>()
  // Writing the note that goes back with "Keep planning".
  const [noting, setNoting] = React.useState(false)
  const [note, setNote] = React.useState("")
  // What a screen reader hears after a move, a removal or a restore.
  const [announcement, setAnnouncement] = React.useState("")
  const [dragging, setDragging] = React.useState<string>()
  const hint = React.useId()

  const editable = !!onReview && !decision && !writing && !error
  const proposed = draftOf(plan)
  const answered =
    decision && decision.decision !== "dismissed" ? decision : undefined
  const current = answered
    ? draftOf(answered.plan)
    : editable
      ? (draft ?? proposed)
      : proposed
  const { edits, tags } = editable
    ? changesOf(proposed, current)
    : { edits: answered?.edits, tags: new Map<string, Tag>() }
  const edited = editable && !!edits && editCount(edits) > 0
  const result = planFrom(current)
  const shownCount = current.steps.filter((step) => !step.removed).length
  const steps = editable ? result.steps.length : shownCount

  const root = React.useRef<HTMLDivElement>(null)
  const list = React.useRef<HTMLOListElement>(null)

  // Focus to move once the change that called for it is on screen. A frame
  // late, so a button that's gone hands focus back first.
  const pendingFocus = React.useRef<{ key: string; at: "start" | "end" }>(
    undefined
  )
  React.useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = undefined
    requestAnimationFrame(() => {
      const field = root.current?.querySelector<HTMLElement>(
        `[data-field="${target.key}"]`
      )
      if (!field) return
      field.focus()
      if (field instanceof HTMLTextAreaElement) {
        const at = target.at === "end" ? field.value.length : 0
        field.setSelectionRange(at, at)
      }
    })
  })
  const focus = (key: string, at: "start" | "end" = "end") => {
    pendingFocus.current = { key, at }
  }

  // Rows that changed place glide there from where they were, so the eye
  // can follow a step to its new place. The row being dragged follows the
  // pointer instead.
  const positions = React.useRef(new Map<string, number>())
  const drag = React.useRef<Drag | null>(null)
  React.useLayoutEffect(() => {
    const rows = list.current?.querySelectorAll<HTMLElement>("[data-step-id]")
    if (!rows) return
    const next = new Map<string, number>()
    const still = reducedMotion()
    for (const row of rows) {
      const id = row.dataset.stepId!
      const top = row.offsetTop
      next.set(id, top)
      const held = drag.current
      if (held?.id === id) {
        row.style.translate = `0 ${held.lastY - held.startY - (top - held.startTop)}px`
        continue
      }
      const was = positions.current.get(id)
      if (was !== undefined && was !== top && !still)
        row.animate([{ translate: `0 ${was - top}px` }, { translate: "0 0" }], {
          duration: GLIDE,
          easing: EASE_OUT,
        })
    }
    positions.current = next
  })

  // Answering takes the buttons away, so focus moves to the card, which
  // says how it was answered, rather than falling to the page.
  const focusWasInside = React.useRef(false)
  React.useEffect(() => {
    if (decision && focusWasInside.current) {
      focusWasInside.current = false
      root.current?.focus({ preventScroll: true })
    }
  }, [decision])

  const edit = (change: (draft: Draft) => Draft) =>
    setDraft((before) => change(before ?? proposed))

  const updateStep = (id: string, patch: Partial<DraftStep>) =>
    edit((before) => ({
      ...before,
      steps: before.steps.map((step) =>
        step.id === id ? { ...step, ...patch } : step
      ),
    }))

  const addStep = (after?: string) => {
    const step = { id: newStepId(), title: "", detail: "" }
    edit((before) => {
      const at = before.steps.findIndex((other) => other.id === after)
      const steps = [...before.steps]
      steps.splice(at === -1 ? steps.length : at + 1, 0, step)
      return { ...before, steps }
    })
    focus(`${step.id}:title`)
  }

  // A proposed step stays listed, struck through, so it can be restored; a
  // step the person added is just gone.
  const removeStep = (step: DraftStep, moveFocus = false) => {
    const added = !step.id.startsWith("proposed-")
    if (moveFocus) {
      const live = current.steps.filter((other) => !other.removed)
      const at = live.findIndex((other) => other.id === step.id)
      const next = live[at - 1] ?? live[at + 1]
      if (next) focus(`${next.id}:title`)
    }
    edit((before) => ({
      ...before,
      steps: added
        ? before.steps.filter((other) => other.id !== step.id)
        : before.steps.map((other) =>
            other.id === step.id ? { ...other, removed: true } : other
          ),
    }))
    setAnnouncement(`Removed “${step.title || "the empty step"}”`)
  }

  const restoreStep = (step: DraftStep) => {
    updateStep(step.id, { removed: false })
    setAnnouncement(`Restored “${step.title}”`)
  }

  const announceMove = (id: string, steps: DraftStep[]) => {
    const live = steps.filter((step) => !step.removed)
    const at = live.findIndex((step) => step.id === id)
    if (at !== -1)
      setAnnouncement(
        `Moved “${live[at].title}” to step ${at + 1} of ${live.length}`
      )
  }

  /** Moves a step to a place in the list, marking it as the one moved. */
  const moveTo = (id: string, target: number) => {
    const steps = current.steps
    const from = steps.findIndex((step) => step.id === id)
    const to = Math.max(0, Math.min(steps.length - 1, target))
    if (from === -1 || from === to) return null
    const next = [...steps]
    const [step] = next.splice(from, 1)
    next.splice(to, 0, { ...step, moved: true })
    edit((before) => ({ ...before, steps: next }))
    return next
  }

  const moveBy = (id: string, by: -1 | 1, keep?: string) => {
    const at = current.steps.findIndex((step) => step.id === id)
    const next = moveTo(id, at + by)
    if (next) announceMove(id, next)
    if (keep) focus(keep)
  }

  const onHandleKey = (event: React.KeyboardEvent, id: string) => {
    const at = current.steps.findIndex((step) => step.id === id)
    const target =
      event.key === "ArrowUp"
        ? at - 1
        : event.key === "ArrowDown"
          ? at + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? current.steps.length - 1
              : null
    if (target === null) return
    event.preventDefault()
    const next = moveTo(id, target)
    if (next) announceMove(id, next)
    focus(`${id}:handle`)
  }

  const onHandleDown = (event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0) return
    const row = event.currentTarget.closest<HTMLElement>("[data-step-id]")
    if (!row) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      id,
      row,
      startY: event.clientY,
      startTop: row.offsetTop,
      lastY: event.clientY,
    }
    setDragging(id)
  }

  const onHandleMove = (event: React.PointerEvent<HTMLElement>) => {
    const held = drag.current
    if (!held || !list.current) return
    held.lastY = event.clientY
    const { row } = held
    const middle =
      held.startTop + row.offsetHeight / 2 + (event.clientY - held.startY)
    const target = [
      ...list.current.querySelectorAll<HTMLElement>("[data-step-id]"),
    ].filter(
      (other) =>
        other !== row && other.offsetTop + other.offsetHeight / 2 < middle
    ).length
    row.style.translate = `0 ${event.clientY - held.startY - (row.offsetTop - held.startTop)}px`
    moveTo(held.id, target)
  }

  const endDrag = () => {
    const held = drag.current
    if (!held) return
    drag.current = null
    const offset = held.row.style.translate
    held.row.style.translate = ""
    if (offset && offset !== "0 0px" && !reducedMotion())
      held.row.animate([{ translate: offset }, { translate: "0 0" }], {
        duration: GLIDE,
        easing: EASE_OUT,
      })
    setDragging(undefined)
    announceMove(held.id, current.steps)
  }

  const answer = (decision: PlanDecision) => {
    focusWasInside.current =
      root.current?.contains(document.activeElement) ?? false
    onReview?.(decision)
  }

  const approve = () => {
    if (!onReview || disabled || result.steps.length === 0) return
    answer({ decision: "approved", plan: result, edited, edits })
  }

  const sendBack = () => {
    const words = note.trim()
    if (!onReview || disabled || !words) return
    setNoting(false)
    answer({ decision: "revised", plan: result, note: words, edits })
  }

  const keysFor =
    (step: DraftStep, field: "title" | "detail") =>
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return
      const key = `${step.id}:${field}`
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        approve()
      } else if (
        event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault()
        moveBy(step.id, event.key === "ArrowUp" ? -1 : 1, key)
      } else if (field === "title" && event.key === "Enter") {
        event.preventDefault()
        addStep(step.id)
      } else if (
        event.key === "Backspace" &&
        event.currentTarget.selectionEnd === 0
      ) {
        if (field === "detail" && step.detail === "") {
          event.preventDefault()
          focus(`${step.id}:title`)
          setActive(step.id)
        } else if (step.title === "" && step.detail === "") {
          event.preventDefault()
          removeStep(step, true)
        }
      } else if (event.key === "Escape") {
        event.currentTarget.blur()
      }
    }

  // Its state, as a badge at the end of the caption row. In brand only while
  // it's being written; amber while it waits on the person.
  const label =
    error !== undefined ? (
      <Status variant="destructive">
        <StatusIndicator />
        <StatusLabel>Failed</StatusLabel>
      </Status>
    ) : writing ? (
      <Status variant="live" pulse>
        <StatusIndicator />
        <StatusLabel>Writing</StatusLabel>
      </Status>
    ) : decision?.decision === "approved" ? (
      <Status variant="success">
        <StatusIndicator />
        <StatusLabel>Approved</StatusLabel>
      </Status>
    ) : decision?.decision === "revised" ? (
      <Status variant="muted">
        <StatusLabel>Sent back</StatusLabel>
      </Status>
    ) : decision?.decision === "dismissed" ? (
      <Status variant="muted">
        <StatusLabel>Dismissed</StatusLabel>
      </Status>
    ) : editable ? (
      <Status variant="pending">
        <StatusIndicator />
        <StatusLabel>Needs approval</StatusLabel>
      </Status>
    ) : (
      <Status variant="muted">
        <StatusLabel>Not reviewed</StatusLabel>
      </Status>
    )

  const settled =
    decision?.decision === "dismissed" ||
    decision?.decision === "revised" ||
    (!editable && !writing && !decision)

  return (
    <div
      ref={root}
      role="group"
      // Takes focus once answered, in place of the buttons that went.
      tabIndex={-1}
      data-slot="plan-review"
      data-state={
        writing
          ? "writing"
          : error !== undefined
            ? "failed"
            : (decision?.decision ?? (editable ? "open" : "unreviewed"))
      }
      aria-label={current.title ? `Plan: ${current.title}` : "Plan"}
      aria-busy={writing || undefined}
      // The thread's thinking indicator gives way while it's being written.
      data-status={writing ? "running" : undefined}
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 rounded-xl border border-border/60 p-4 text-sm outline-none",
        className
      )}
    >
      <span role="status" className="sr-only">
        {announcement}
      </span>
      <span id={hint} className="sr-only">
        Drag, or use the arrow keys, Home and End, to move the step.
      </span>

      <header className="flex min-w-0 flex-col gap-1">
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            Plan
            {steps > 0 ? (
              <span className="tabular-nums">
                {" · "}
                {plural(steps, "step")}
              </span>
            ) : null}
          </span>
          <span role="status" className="ms-auto shrink-0">
            {label}
          </span>
        </div>
        {editable ? (
          <PlanField
            aria-label="Plan title"
            placeholder="Untitled plan"
            value={current.title}
            data-field="title"
            onChange={(event) =>
              edit((before) => ({ ...before, title: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return
              const first = current.steps.find((step) => !step.removed)
              if (event.key === "Enter") {
                event.preventDefault()
                if (event.metaKey || event.ctrlKey) approve()
                else if (first) {
                  focus(`${first.id}:title`, "start")
                  setActive(first.id)
                }
              } else if (event.key === "Escape") event.currentTarget.blur()
            }}
            className="text-base font-medium"
          />
        ) : current.title ? (
          <PlanText
            className={cn(
              "text-base font-medium",
              settled && "text-muted-foreground"
            )}
          >
            {current.title}
          </PlanText>
        ) : writing ? (
          <Skeleton className="my-1 h-5 w-1/2" />
        ) : null}
      </header>

      <ol
        ref={list}
        aria-label="Steps"
        className="relative flex min-w-0 flex-col gap-1.5"
      >
        {current.steps.map((step) => {
          const position =
            current.steps
              .filter((other) => !other.removed)
              .findIndex((other) => other.id === step.id) + 1
          const showDetail =
            !step.removed &&
            (step.detail !== "" || (editable && active === step.id))
          const tag = tags.get(step.id)
          const held = dragging === step.id
          return (
            <li
              key={step.id}
              data-step-id={step.id}
              data-removed={step.removed || undefined}
              data-dragging={held || undefined}
              className={cn(
                "group/step relative flex min-w-0 items-start gap-3 rounded-md",
                // Lifted while it's carried, as anything floating is.
                held && "z-10 bg-popover shadow-md ring-1 ring-border/60"
              )}
              onFocus={() => setActive(step.id)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setActive((was) => (was === step.id ? undefined : was))
              }}
            >
              {/* The number is the handle: it turns into a grip as the row
                  is hovered or the handle focused. */}
              {editable && !step.removed ? (
                <button
                  type="button"
                  data-field={`${step.id}:handle`}
                  aria-label={`Move step ${position}, “${step.title || "new step"}”`}
                  aria-describedby={hint}
                  onKeyDown={(event) => onHandleKey(event, step.id)}
                  onPointerDown={(event) => onHandleDown(event, step.id)}
                  onPointerMove={onHandleMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="group/handle mt-px grid h-6 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                >
                  <span
                    aria-hidden
                    className="text-end text-base tabular-nums transition-opacity duration-150 [grid-area:1/1] group-hover/step:opacity-0 group-focus-visible/handle:opacity-0 motion-reduce:transition-none sm:text-sm"
                  >
                    {position}
                  </span>
                  <HugeiconsIcon
                    aria-hidden
                    icon={GripVerticalIcon}
                    className="size-4 opacity-0 transition-opacity duration-150 [grid-area:1/1] group-hover/step:opacity-100 group-focus-visible/handle:opacity-100 motion-reduce:transition-none"
                  />
                </button>
              ) : (
                <span
                  aria-hidden
                  className="w-5 shrink-0 border border-transparent py-0.5 text-end text-base text-muted-foreground tabular-nums sm:text-sm"
                >
                  {step.removed ? "–" : position}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                {editable && !step.removed ? (
                  <>
                    <PlanField
                      aria-label={`Step ${position}`}
                      placeholder="Step"
                      value={step.title}
                      data-field={`${step.id}:title`}
                      onChange={(event) =>
                        updateStep(step.id, { title: event.target.value })
                      }
                      onKeyDown={keysFor(step, "title")}
                    />
                    {showDetail ? (
                      <PlanField
                        aria-label={`Step ${position} details`}
                        placeholder="Add details"
                        value={step.detail}
                        data-field={`${step.id}:detail`}
                        onChange={(event) =>
                          updateStep(step.id, { detail: event.target.value })
                        }
                        onKeyDown={keysFor(step, "detail")}
                        className="text-muted-foreground"
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <PlanText
                      className={cn(
                        (settled || step.removed) && "text-muted-foreground",
                        step.removed && "line-through decoration-foreground/30"
                      )}
                    >
                      {step.title}
                    </PlanText>
                    {showDetail ? (
                      <PlanText className="text-muted-foreground">
                        {step.detail}
                      </PlanText>
                    ) : null}
                  </>
                )}
              </div>
              {tag ? (
                <span className="mt-1 shrink-0 text-xs text-muted-foreground">
                  {tag}
                </span>
              ) : null}
              {editable ? (
                <TooltipIconButton
                  tooltip={step.removed ? "Restore step" : "Remove step"}
                  side="top"
                  onClick={() =>
                    step.removed ? restoreStep(step) : removeStep(step)
                  }
                  className={cn(
                    "mt-px transition-[opacity,scale,background-color] duration-80 motion-reduce:transition-none",
                    !step.removed && onHover
                  )}
                >
                  <HugeiconsIcon
                    aria-hidden
                    icon={step.removed ? Undo02Icon : Cancel01Icon}
                  />
                </TooltipIconButton>
              ) : null}
            </li>
          )
        })}
        {/* Its shape is known while the first steps are on their way. */}
        {writing && current.steps.length === 0
          ? [0, 1].map((row) => (
              <li key={row} aria-hidden className="flex items-center gap-3">
                <span className="w-5 shrink-0" />
                <Skeleton className="my-1 h-4 flex-1" />
              </li>
            ))
          : null}
        {editable ? (
          <li>
            <button
              type="button"
              onClick={() => addStep(current.steps.at(-1)?.id)}
              className="flex items-center gap-3 rounded-sm border border-transparent py-0.5 pe-1.5 text-muted-foreground transition-[color,scale] duration-80 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none"
            >
              <span className="flex w-5 justify-end">
                <HugeiconsIcon
                  aria-hidden
                  icon={Add01Icon}
                  className="size-4"
                />
              </span>
              Add step
            </button>
          </li>
        ) : null}
      </ol>

      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}

      {/* What it was sent back with. */}
      {decision?.decision === "revised" && decision.note ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-pretty whitespace-pre-wrap text-muted-foreground">
          {decision.note}
        </p>
      ) : null}

      {/* Once answered, what was changed before it was. */}
      {answered && answered.edits && editCount(answered.edits) > 0 ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {plural(editCount(answered.edits), "edit")}:{" "}
          {editSummary(answered.edits)}
        </p>
      ) : null}

      {editable && noting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            autoFocus
            rows={2}
            value={note}
            aria-label="What should change?"
            placeholder="What should change?"
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                sendBack()
              } else if (event.key === "Escape") {
                event.preventDefault()
                setNoting(false)
              }
            }}
            className="min-h-0 resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={disabled || !note.trim()}
              onClick={sendBack}
            >
              Send back
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setNoting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : editable ? (
        <footer className="flex flex-wrap items-center gap-2">
          {/* The main action first, as on every card that asks. */}
          <Button
            size="sm"
            disabled={disabled || result.steps.length === 0}
            onClick={approve}
          >
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setNoting(true)}
          >
            Keep planning
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => answer({ decision: "dismissed" })}
          >
            Dismiss
          </Button>
          <span
            aria-live="polite"
            className="ms-auto text-xs text-muted-foreground tabular-nums"
          >
            {edited && edits ? plural(editCount(edits), "edit") : "As proposed"}
          </span>
          {edited ? (
            <Button
              variant="ghost"
              size="sm"
              className="-me-2.5"
              onClick={() => setDraft(null)}
            >
              Reset
            </Button>
          ) : null}
        </footer>
      ) : null}
    </div>
  )
}

export { PLAN_TOOL, PlanReview, planApproved, planMarkdown, planOf, plansIn }
export type { Plan, PlanCall, PlanDecision, PlanEdits, PlanStep }
