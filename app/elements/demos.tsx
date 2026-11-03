"use client"

import * as React from "react"
import {
  AiBrain01Icon,
  GlobalSearchIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  Mail01Icon,
  Sun03Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { ToolUIPart } from "ai"

import { EmailApproval } from "@/components/aiellie/email-approval"
import {
  PlanReview,
  type Plan,
  type PlanDecision,
} from "@/components/aiellie/plan-review"
import { Reasoning } from "@/components/aiellie/reasoning"
import { Sources } from "@/components/aiellie/sources"
import { ThinkingIndicator } from "@/components/aiellie/thinking-indicator"
import { WeatherCard } from "@/components/aiellie/weather-card"
import { WebSearch, type Found } from "@/components/aiellie/web-search"

// Every element in components/aiellie that goes in the @aiellie registry,
// each shown in every state it can be in, from sample data. The elements
// are the real components; only what they're given is made up. A new
// element gets an entry here, with a state for each row of its state table.

type ElementState = {
  /** The state, as the dialog labels it. */
  label: string
  render: () => React.ReactNode
}

type ElementEntry = {
  id: string
  name: string
  /** What it is, in a few words, as its row says. */
  summary: string
  icon: IconSvgElement
  /** Where it lives, and what to install. */
  file: string
  states: ElementState[]
}

// A tool part as the AI SDK would hand it over, for the cards that take one.
const toolPart = (type: string, part: Record<string, unknown>) =>
  ({ type, toolCallId: "demo", ...part }) as unknown as ToolUIPart

// Email ----------------------------------------------------------------------

const email = {
  to: "sam@example.com",
  subject: "Running late",
  body: "Hi Sam,\n\nI'm running about ten minutes late for our 3pm. Start without me and I'll catch up.\n\nEllie",
}
const emailPart = (part: Record<string, unknown>) =>
  toolPart("tool-send_email", { input: email, ...part })

/**
 * The email card answering for real: Send email goes through sending to
 * sent, Don't send to not sent. Nothing leaves.
 */
function EmailTryIt() {
  const [part, setPart] = React.useState(() =>
    emailPart({ state: "approval-requested", approval: { id: "demo" } })
  )
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const respond = (id: string, approved: boolean) => {
    setPart(
      emailPart({ state: "approval-responded", approval: { id, approved } })
    )
    if (approved)
      timer.current = setTimeout(
        () =>
          setPart(
            emailPart({
              state: "output-available",
              output: { id: "demo", to: email.to, sentAt: Date.now() },
              approval: { id, approved: true },
            })
          ),
        1200
      )
  }
  const reset = () =>
    setPart(
      emailPart({ state: "approval-requested", approval: { id: "demo" } })
    )

  const done = part.state !== "approval-requested"
  return (
    <div className="flex flex-col gap-2">
      <EmailApproval part={part} onRespond={respond} />
      {done ? <ResetButton onClick={reset} /> : null}
    </div>
  )
}

// Plan -----------------------------------------------------------------------

const plan: Plan = {
  title: "Launch a portfolio site",
  steps: [
    { title: "Pick a domain" },
    { title: "Build the pages", detail: "Overview and products" },
    { title: "Deploy to Vercel" },
  ],
}

/** The plan answering for real: edit it, then approve or dismiss it. */
function PlanTryIt() {
  const [decision, setDecision] = React.useState<PlanDecision>()
  return (
    <div className="flex flex-col gap-2">
      <PlanReview plan={plan} decision={decision} onReview={setDecision} />
      {decision ? <ResetButton onClick={() => setDecision(undefined)} /> : null}
    </div>
  )
}

// Weather --------------------------------------------------------------------

const weather = {
  location: "Lisbon",
  temperature: 18,
  condition: "Partly cloudy",
  high: 21,
  low: 12,
  wind: 14,
}

// Search ---------------------------------------------------------------------

const found: Found[] = [
  {
    url: "https://www.assistant-ui.com/docs",
    title: "assistant-ui documentation",
    snippet: "React components for AI chat.",
  },
  {
    url: "https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage",
    title: "Chatbot tool usage",
    snippet: "Tool calls, approvals and results in the AI SDK.",
  },
  {
    url: "https://ui.shadcn.com/docs/registry",
    title: "Registry",
    snippet: "Run your own component registry.",
  },
  {
    url: "https://vercel.com/docs",
    title: "Vercel documentation",
  },
]

const thoughts =
  "They want a short note to Sam. Keep it to two sentences, and offer to start without them."

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-fit rounded-sm text-xs text-muted-foreground transition-colors duration-80 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      Reset
    </button>
  )
}

const ELEMENTS: ElementEntry[] = [
  {
    id: "email-approval",
    name: "Email approval",
    summary: "An email the model wants to send, held for Send or Don't send",
    icon: Mail01Icon,
    file: "components/aiellie/email-approval.tsx",
    states: [
      { label: "Try it", render: () => <EmailTryIt /> },
      {
        label: "Drafting",
        render: () => (
          <EmailApproval
            part={toolPart("tool-send_email", {
              state: "input-streaming",
              input: { to: email.to },
            })}
          />
        ),
      },
      {
        label: "Needs approval",
        render: () => (
          <EmailApproval
            part={emailPart({
              state: "approval-requested",
              approval: { id: "demo" },
            })}
            onRespond={() => {}}
          />
        ),
      },
      {
        label: "Sending",
        render: () => (
          <EmailApproval
            part={emailPart({
              state: "approval-responded",
              approval: { id: "demo", approved: true },
            })}
          />
        ),
      },
      {
        label: "Sent",
        render: () => (
          <EmailApproval
            part={emailPart({
              state: "output-available",
              output: {
                id: "demo",
                to: email.to,
                sentAt: Date.UTC(2026, 10, 3, 14, 5),
              },
              approval: { id: "demo", approved: true },
            })}
          />
        ),
      },
      {
        label: "Not sent",
        render: () => (
          <EmailApproval
            part={emailPart({
              state: "output-denied",
              approval: { id: "demo", approved: false },
            })}
          />
        ),
      },
      {
        label: "Failed",
        render: () => (
          <EmailApproval
            part={emailPart({
              state: "output-error",
              errorText: "The domain aiellie.dev isn't verified yet.",
            })}
          />
        ),
      },
    ],
  },
  {
    id: "plan-review",
    name: "Plan review",
    summary: "A plan to reorder and edit, then approve, send back or dismiss",
    icon: LeftToRightListNumberIcon,
    file: "components/aiellie/plan-review.tsx",
    states: [
      { label: "Try it", render: () => <PlanTryIt /> },
      {
        label: "Writing",
        render: () => <PlanReview plan={{ steps: [] }} writing />,
      },
      {
        label: "Approved with edits",
        render: () => (
          <PlanReview
            plan={plan}
            decision={{
              decision: "approved",
              plan,
              edited: true,
              edits: { moved: 1, rewritten: 1, added: 0, removed: 1 },
            }}
          />
        ),
      },
      {
        label: "Sent back",
        render: () => (
          <PlanReview
            plan={plan}
            decision={{
              decision: "revised",
              plan,
              note: "Do the domain last, once the pages are built.",
            }}
          />
        ),
      },
      {
        label: "Dismissed",
        render: () => (
          <PlanReview plan={plan} decision={{ decision: "dismissed" }} />
        ),
      },
      { label: "Not reviewed", render: () => <PlanReview plan={plan} /> },
      {
        label: "Failed",
        render: () => (
          <PlanReview plan={plan} error="The plan couldn't be read." />
        ),
      },
    ],
  },
  {
    id: "weather-card",
    name: "Weather card",
    summary: "The weather for a place, from a tool call",
    icon: Sun03Icon,
    file: "components/aiellie/weather-card.tsx",
    states: [
      {
        label: "Loading",
        render: () => (
          <WeatherCard
            part={toolPart("tool-get_weather", {
              state: "input-available",
              input: { location: "Lisbon" },
            })}
          />
        ),
      },
      {
        label: "Result",
        render: () => (
          <WeatherCard
            part={toolPart("tool-get_weather", {
              state: "output-available",
              input: { location: "Lisbon" },
              output: weather,
            })}
          />
        ),
      },
      {
        label: "Failed",
        render: () => (
          <WeatherCard
            part={toolPart("tool-get_weather", {
              state: "output-error",
              input: { location: "Zxqvbland" },
              errorText: "Couldn't find Zxqvbland.",
            })}
          />
        ),
      },
    ],
  },
  {
    id: "web-search",
    name: "Web search",
    summary: "A search's trace line, folding open onto what it found",
    icon: GlobalSearchIcon,
    file: "components/aiellie/web-search.tsx",
    states: [
      {
        label: "Searching",
        render: () => (
          <WebSearch queries={["assistant-ui tool UI"]} found={[]} searching />
        ),
      },
      {
        label: "Done",
        render: () => (
          <WebSearch queries={["assistant-ui tool UI"]} found={found} />
        ),
      },
    ],
  },
  {
    id: "reasoning",
    name: "Reasoning",
    summary: "The model's thinking, as one quiet row above its reply",
    icon: AiBrain01Icon,
    file: "components/aiellie/reasoning.tsx",
    states: [
      {
        label: "Thought",
        render: () => <Reasoning text={thoughts} duration={4} />,
      },
    ],
  },
  {
    id: "sources",
    name: "Sources",
    summary: "The pages a reply drew on, as chips with previews",
    icon: Link01Icon,
    file: "components/aiellie/sources.tsx",
    states: [{ label: "Pages", render: () => <Sources sources={found} /> }],
  },
  {
    id: "thinking-indicator",
    name: "Thinking indicator",
    summary: "What the model is doing before its first word, with the seconds",
    icon: Loading03Icon,
    file: "components/aiellie/thinking-indicator.tsx",
    states: [
      { label: "Thinking", render: () => <ThinkingIndicator /> },
      {
        label: "Naming the work",
        render: () => <ThinkingIndicator>Searching the web</ThinkingIndicator>,
      },
    ],
  },
]

export { ELEMENTS }
export type { ElementEntry, ElementState }
