"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import type { LanguageModelUsage, UIMessage } from "ai"

import { menuPopup } from "@/components/ui/menu"
import type { ReplyMetadata } from "@/lib/model-messages"
import type { ModelOption } from "@/lib/models"
import { cn } from "@/lib/utils"

const count = new Intl.NumberFormat("en")
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const dollars = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** What a reply cost, from its tokens and its model's prices. */
function costOf(usage: LanguageModelUsage, pricing: ModelOption["pricing"]) {
  if (!pricing) return undefined
  const cached = usage.inputTokenDetails?.cacheReadTokens ?? 0
  const fresh = (usage.inputTokens ?? 0) - cached
  return (
    fresh * pricing.input +
    cached * (pricing.cacheRead ?? pricing.input) +
    (usage.outputTokens ?? 0) * pricing.output
  )
}

/**
 * Where a chat stands against its model's context window. The last reply's
 * prompt and reply are what the next request carries, plus the new message.
 */
function contextOf(
  messages: UIMessage[],
  models: ModelOption[],
  model: string
) {
  const replies = messages
    .map((message) => message.metadata as ReplyMetadata | undefined)
    .filter((metadata): metadata is ReplyMetadata => !!metadata?.usage)
  const last = replies.at(-1)?.usage
  const costs = replies.map((reply) =>
    costOf(reply.usage, models.find((m) => m.id === reply.model)?.pricing)
  )

  return {
    used: last ? (last.inputTokens ?? 0) + (last.outputTokens ?? 0) : 0,
    limit: models.find((m) => m.id === model)?.contextWindow,
    last,
    cost: costs.some((cost) => cost !== undefined)
      ? costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0)
      : undefined,
  }
}

function Ring({ share }: { share: number }) {
  const radius = 6
  const around = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 -rotate-90">
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-muted"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={around}
        // A sliver stays, so a fresh chat still reads as a meter.
        strokeDashoffset={around * (1 - Math.max(share, 0.02))}
        className="stroke-current transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}

function Row({ label, value }: { label: string; value?: number }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end tabular-nums">
        {value === undefined ? "–" : count.format(value)}
      </dd>
    </>
  )
}

/**
 * How full the chat's context window is, as a ring in the composer. Hovering
 * it shows the tokens behind that and what the chat has cost.
 */
function ContextMeter({
  used,
  limit,
  last,
  cost,
  className,
}: {
  /** Tokens the conversation takes up now. */
  used: number
  /** The model's context window, when known. */
  limit?: number
  /** The last reply's usage, broken down. */
  last?: LanguageModelUsage
  /** What the chat has cost so far, in US dollars. */
  cost?: number
} & { className?: string }) {
  const share = limit ? Math.min(1, used / limit) : 0
  const percent = limit
    ? `${share < 0.1 && share > 0 ? (share * 100).toFixed(1) : Math.round(share * 100)}%`
    : compact.format(used)

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        aria-label={
          limit
            ? `Context used: ${percent} of ${compact.format(limit)} tokens`
            : `Context used: ${count.format(used)} tokens`
        }
        data-slot="context-meter"
        className={cn(
          "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-1.5 text-xs text-muted-foreground tabular-nums outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted",
          share >= 0.75 && "text-foreground",
          share >= 0.9 && "text-destructive hover:text-destructive",
          className
        )}
      >
        <Ring share={share} />
        {percent}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="isolate z-50"
        >
          <Popover.Popup className={cn(menuPopup("solid"), "w-64 p-3 text-sm")}>
            <div className="flex items-baseline justify-between gap-2">
              <Popover.Title className="font-medium">Context</Popover.Title>
              {limit ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {percent}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {count.format(used)}
              {limit ? ` of ${count.format(limit)}` : ""} tokens
            </p>
            {limit ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-foreground transition-[width] duration-300",
                    share >= 0.9 && "bg-destructive"
                  )}
                  style={{ width: `${share * 100}%` }}
                />
              </div>
            ) : null}
            {last ? (
              <>
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  Last reply
                </p>
                <dl className="mt-1 grid grid-cols-[1fr_auto] gap-y-0.5 text-xs">
                  <Row label="Input" value={last.inputTokens} />
                  <Row
                    label="Cached input"
                    value={last.inputTokenDetails?.cacheReadTokens}
                  />
                  <Row label="Output" value={last.outputTokens} />
                  <Row
                    label="Reasoning"
                    value={last.outputTokenDetails?.reasoningTokens}
                  />
                </dl>
              </>
            ) : (
              <Popover.Description className="mt-3 text-xs text-muted-foreground">
                Nothing sent yet. It fills as the chat goes on.
              </Popover.Description>
            )}
            {cost !== undefined ? (
              <div className="mt-3 flex justify-between border-t pt-2 text-xs">
                <span className="text-muted-foreground">Chat so far</span>
                <span className="tabular-nums">{dollars.format(cost)}</span>
              </div>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { ContextMeter, contextOf }
