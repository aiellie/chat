"use client"

import * as React from "react"
import {
  Add01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { cn } from "@/lib/utils"

/** The tool a model calls to propose a plan, unless the app names another. */
const PLAN_TOOL = "propose_plan"

type PlanStep = { title: string; detail?: string }

type Plan = { title?: string; steps: PlanStep[] }

/** What the person made of a plan, sent back to the model as the tool's output. */
type PlanDecision =
  | { decision: "approved"; plan: Plan; edited: boolean }
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

function decisionOf(output: unknown): PlanDecision | undefined {
  const entry = record(output)
  if (entry?.decision === "dismissed") return { decision: "dismissed" }
  if (entry?.decision === "approved")
    return {
      decision: "approved",
      plan: planOf(entry.plan),
      edited: entry.edited === true,
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
 * a plan the last reply proposed, so the model goes on to carry it out.
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
      (call) => call.decision?.decision === "approved"
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

type DraftStep = { id: string; title: string; detail: string }
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

/** The draft as it goes to the model: trimmed, without steps left empty. */
function planFrom(draft: Draft): Plan {
  return {
    title: draft.title.trim() || undefined,
    steps: draft.steps.flatMap((step) => {
      const title = step.title.trim()
      const detail = step.detail.trim()
      return title ? [detail ? { title, detail } : { title }] : []
    }),
  }
}

const samePlan = (a: Plan, b: Plan) =>
  JSON.stringify(planFrom(draftOf(a))) === JSON.stringify(planFrom(draftOf(b)))

// Option on Apple keyboards, Alt elsewhere. Read as a menu opens, in the
// browser only.
const altKey = () =>
  /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌥" : "Alt+"

// A field and the plain text it becomes share one box, so nothing shifts as
// a plan turns editable or settles. Its border shows on hover and focus.
// Inputs under 16px make iOS zoom in, so a phone gets the larger size.
const box =
  "rounded-sm border border-transparent px-1.5 py-0.5 text-base text-sm"

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

/**
 * A plan a model proposed, for the person to review before it's carried
 * out. With `onReview` they can reword, reorder, add and remove steps, then
 * approve the plan as they left it or dismiss it. Without it, or once
 * answered, it's read-only. While `writing`, its steps fill in as they come.
 *
 * In a step: Enter adds one after it, Backspace in an empty one removes it,
 * Alt+↑ and Alt+↓ move it, and ⌘ or Ctrl+Enter approves.
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

  const editable = !!onReview && !decision && !writing && !error
  const proposed = draftOf(plan)
  const current =
    decision?.decision === "approved"
      ? draftOf(decision.plan)
      : editable
        ? (draft ?? proposed)
        : proposed
  const edited = editable && draft !== null && !samePlan(planFrom(draft), plan)
  const result = planFrom(current)
  const count = editable ? result.steps.length : current.steps.length

  // Focus to move once the change that called for it is on screen. A frame
  // late, so a menu closing hands focus back to its trigger first.
  const root = React.useRef<HTMLDivElement>(null)
  const pendingFocus = React.useRef<{ key: string; at: "start" | "end" }>(
    undefined
  )
  React.useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = undefined
    requestAnimationFrame(() => {
      const field = root.current?.querySelector<HTMLTextAreaElement>(
        `textarea[data-field="${target.key}"]`
      )
      if (!field) return
      field.focus()
      const at = target.at === "end" ? field.value.length : 0
      field.setSelectionRange(at, at)
    })
  })
  const focus = (key: string, at: "start" | "end" = "end") => {
    pendingFocus.current = { key, at }
  }

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

  const removeStep = (id: string) => {
    const at = current.steps.findIndex((step) => step.id === id)
    const next = current.steps[at - 1] ?? current.steps[at + 1]
    edit((before) => ({
      ...before,
      steps: before.steps.filter((step) => step.id !== id),
    }))
    if (next) focus(`${next.id}:title`)
  }

  const moveStep = (id: string, by: -1 | 1, keep?: string) => {
    edit((before) => {
      const at = before.steps.findIndex((step) => step.id === id)
      const to = at + by
      if (at === -1 || to < 0 || to >= before.steps.length) return before
      const steps = [...before.steps]
      ;[steps[at], steps[to]] = [steps[to], steps[at]]
      return { ...before, steps }
    })
    if (keep) focus(keep)
  }

  const approve = () => {
    if (!onReview || disabled || result.steps.length === 0) return
    onReview({ decision: "approved", plan: result, edited })
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
        moveStep(step.id, event.key === "ArrowUp" ? -1 : 1, key)
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
          removeStep(step.id)
        }
      } else if (event.key === "Escape") {
        event.currentTarget.blur()
      }
    }

  const label =
    error !== undefined ? (
      <Status variant="destructive">
        <StatusIndicator />
        <StatusLabel>Failed</StatusLabel>
      </Status>
    ) : decision?.decision === "approved" ? (
      <span className="flex items-center gap-1">
        <HugeiconsIcon aria-hidden icon={Tick02Icon} className="size-3.5" />
        {decision.edited ? "Approved with edits" : "Approved"}
      </span>
    ) : decision?.decision === "dismissed" ? (
      "Dismissed"
    ) : writing ? null : !onReview ? (
      "Not reviewed"
    ) : edited ? (
      "Edited"
    ) : null

  const settled =
    decision?.decision === "dismissed" || (!editable && !writing && !decision)

  return (
    <div
      ref={root}
      role="group"
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
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 rounded-xl border border-border/60 p-4 text-sm",
        className
      )}
    >
      <header className="flex min-w-0 flex-col gap-1">
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            <span
              className={cn(writing && "shimmer motion-reduce:animate-none")}
            >
              {writing ? "Writing a plan" : "Plan"}
            </span>
            {count > 0 ? (
              <span className="tabular-nums">
                {" · "}
                {count} {count === 1 ? "step" : "steps"}
              </span>
            ) : null}
          </span>
          {label !== null ? (
            <span className="ms-auto shrink-0">{label}</span>
          ) : null}
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
              if (event.key === "Enter") {
                event.preventDefault()
                if (event.metaKey || event.ctrlKey) approve()
                else if (current.steps[0]) {
                  focus(`${current.steps[0].id}:title`, "start")
                  setActive(current.steps[0].id)
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

      <ol aria-label="Steps" className="flex min-w-0 flex-col gap-1.5">
        {current.steps.map((step, index) => {
          const showDetail =
            step.detail !== "" || (editable && active === step.id)
          return (
            <li
              key={step.id}
              className="group/step flex min-w-0 items-start gap-3"
              onFocus={() => setActive(step.id)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setActive((was) => (was === step.id ? undefined : was))
              }}
            >
              <span
                aria-hidden
                className="w-5 shrink-0 border border-transparent py-0.5 text-end text-base text-muted-foreground tabular-nums text-sm"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                {editable ? (
                  <>
                    <PlanField
                      aria-label={`Step ${index + 1}`}
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
                        aria-label={`Step ${index + 1} details`}
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
                      className={cn(settled && "text-muted-foreground")}
                    >
                      {step.title}
                    </PlanText>
                    {step.detail ? (
                      <PlanText className="text-muted-foreground">
                        {step.detail}
                      </PlanText>
                    ) : null}
                  </>
                )}
              </div>
              {editable ? (
                <Menu>
                  <MenuTrigger
                    render={
                      <TooltipIconButton
                        tooltip="More"
                        side="top"
                        className="mt-px opacity-0 transition-[opacity,scale,background-color] duration-80 group-focus-within/step:opacity-100 group-hover/step:opacity-100 data-popup-open:bg-muted data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100 data-popup-open:[&_svg]:text-foreground"
                      />
                    }
                  >
                    <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
                  </MenuTrigger>
                  <MenuContent side="bottom" align="end">
                    <MenuItem
                      disabled={index === 0}
                      onClick={() => moveStep(step.id, -1, `${step.id}:title`)}
                    >
                      <HugeiconsIcon aria-hidden icon={ArrowUp02Icon} />
                      Move up
                      <MenuShortcut>{altKey()}↑</MenuShortcut>
                    </MenuItem>
                    <MenuItem
                      disabled={index === current.steps.length - 1}
                      onClick={() => moveStep(step.id, 1, `${step.id}:title`)}
                    >
                      <HugeiconsIcon aria-hidden icon={ArrowDown02Icon} />
                      Move down
                      <MenuShortcut>{altKey()}↓</MenuShortcut>
                    </MenuItem>
                    <MenuItem onClick={() => addStep(step.id)}>
                      <HugeiconsIcon aria-hidden icon={Add01Icon} />
                      Add step below
                      <MenuShortcut>↵</MenuShortcut>
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      variant="destructive"
                      onClick={() => removeStep(step.id)}
                    >
                      <HugeiconsIcon aria-hidden icon={Delete02Icon} />
                      Remove step
                    </MenuItem>
                  </MenuContent>
                </Menu>
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

      {editable ? (
        <footer className="flex items-center gap-2">
          {edited ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ms-2.5"
              onClick={() => setDraft(null)}
            >
              Reset
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onReview?.({ decision: "dismissed" })}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            disabled={disabled || result.steps.length === 0}
            onClick={approve}
          >
            Approve
          </Button>
        </footer>
      ) : null}
    </div>
  )
}

export { PLAN_TOOL, PlanReview, planApproved, planMarkdown, planOf, plansIn }
export type { Plan, PlanCall, PlanDecision, PlanStep }
