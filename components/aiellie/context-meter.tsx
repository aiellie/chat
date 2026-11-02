"use client"

import * as React from "react"
import type { LanguageModelUsage, UIMessage } from "ai"

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
        className="stroke-current transition-[stroke-dashoffset] duration-280 motion-reduce:transition-none"
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
 * it names that usage; clicking opens the tokens and cost behind it.
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
  const label = limit
    ? `Context used: ${percent} of ${compact.format(limit)} tokens`
    : `Context used: ${count.format(used)} tokens`
  const hint = limit ? `${percent} context used` : label

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              delay={150}
              aria-label={label}
              data-slot="context-meter"
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:text-foreground",
                share >= 0.75 && "text-foreground",
                share >= 0.9 && "text-destructive hover:text-destructive",
                className
              )}
            />
          }
        >
          <Ring share={share} />
          <span className="sr-only">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{hint}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-64 gap-3 p-3"
      >
        <PopoverHeader>
          <div className="flex items-baseline justify-between gap-2">
            <PopoverTitle>Context</PopoverTitle>
            {limit ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {percent}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {count.format(used)}
            {limit ? ` of ${count.format(limit)}` : ""} tokens
          </p>
        </PopoverHeader>
        {limit ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-foreground transition-[width] duration-280 motion-reduce:transition-none",
                share >= 0.9 && "bg-destructive"
              )}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        ) : null}
        {last ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              Last reply
            </p>
            <dl className="grid grid-cols-[1fr_auto] gap-y-0.5 text-xs">
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
          </div>
        ) : (
          <PopoverDescription className="text-xs">
            Nothing sent yet. It fills as the chat goes on.
          </PopoverDescription>
        )}
        {cost !== undefined ? (
          <div className="flex justify-between border-t pt-2 text-xs">
            <span className="text-muted-foreground">Chat so far</span>
            <span className="tabular-nums">{dollars.format(cost)}</span>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export { ContextMeter, contextOf }
