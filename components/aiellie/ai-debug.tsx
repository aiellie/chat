"use client"

import * as React from "react"
import { ArrowDown01Icon, Bug01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import {
  getExchanges,
  subscribeExchanges,
  type Exchange,
} from "@/components/aiellie/ai-debug-store"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/aiellie/code-block"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { usePanels } from "@/components/panels"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { toModelMessages, type ReplyMetadata } from "@/lib/model-messages"
import { cn } from "@/lib/utils"

const NO_EXCHANGES: Exchange[] = []

// Files go as data URLs, which would bury everything else in base64.
function shortened(_key: string, value: unknown) {
  if (
    typeof value === "string" &&
    value.startsWith("data:") &&
    value.length > 120
  )
    return `${value.slice(0, value.indexOf(",") + 1)}… (${Math.round(value.length / 1365)} KB)`
  if (value instanceof Uint8Array) return `[${value.byteLength} bytes]`
  if (value instanceof URL) return value.href
  return value
}

const json = (value: unknown) => JSON.stringify(value, shortened, 2)

/** What the reply's events add up to. */
function summarize(exchange: Exchange) {
  let thinking = ""
  let reply = ""
  let finishReason: string | undefined
  let metadata: ReplyMetadata | undefined
  const tools: unknown[] = []
  for (const { chunk } of exchange.events) {
    if (chunk.type === "reasoning-delta") thinking += chunk.delta
    else if (chunk.type === "text-delta") reply += chunk.delta
    else if (chunk.type.startsWith("tool-")) tools.push(chunk)
    if (chunk.type === "finish") finishReason = chunk.finishReason
    if (
      (chunk.type === "finish" || chunk.type === "message-metadata") &&
      chunk.messageMetadata
    )
      metadata = chunk.messageMetadata as ReplyMetadata
  }
  return {
    thinking,
    reply,
    tools,
    metadata,
    finishReason: metadata?.finishReason ?? finishReason,
  }
}

/** The chat as the model got it, worked out the same way the route does. */
function useModelMessages(messages: UIMessage[]) {
  const [converted, setConverted] = React.useState<{
    from: UIMessage[]
    value: unknown
  }>()

  React.useEffect(() => {
    let live = true
    toModelMessages(messages).then(
      (value) => live && setConverted({ from: messages, value }),
      (error) =>
        live &&
        setConverted({ from: messages, value: { error: String(error) } })
    )
    return () => {
      live = false
    }
  }, [messages])

  return converted?.from === messages ? converted.value : undefined
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const code = React.useMemo(() => json(value), [value])
  const lines = useHighlightedCode(code, "json")

  return (
    <CodeBlock size="sm" className="max-h-80">
      <CodeBlockHeader>
        <CodeBlockTitle>{title}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Prose({ text, empty }: { text: string; empty: string }) {
  return text ? (
    <p className="max-h-60 overflow-auto rounded-lg bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
      {text}
    </p>
  ) : (
    <p className="text-sm text-muted-foreground">{empty}</p>
  )
}

const STATE_LABEL: Record<Exchange["state"], string> = {
  streaming: "Streaming",
  done: "Done",
  stopped: "Stopped",
  failed: "Failed",
}

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
}

function ExchangeCard({
  exchange,
  defaultOpen,
}: {
  exchange: Exchange
  /** Read once: a newer request arriving shouldn't fold this one away. */
  defaultOpen: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const sent = useModelMessages(exchange.request.messages)
  const { thinking, reply, tools, metadata, finishReason } = summarize(exchange)
  const usage = metadata?.usage
  const took =
    exchange.endedAt === undefined
      ? undefined
      : seconds(exchange.endedAt - exchange.startedAt)
  const firstEvent = exchange.events.find(
    ({ chunk }) =>
      chunk.type === "text-delta" || chunk.type === "reasoning-delta"
  )

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border bg-card text-card-foreground"
    >
      <CollapsibleTrigger className="group/exchange flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm">
        <span className="font-medium tabular-nums">#{exchange.number}</span>
        <span className="min-w-0 truncate text-muted-foreground">
          {metadata?.model ?? exchange.request.model ?? "default model"}
        </span>
        <span
          className={cn(
            "ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs",
            exchange.state === "failed"
              ? "bg-destructive/10 text-destructive"
              : exchange.state === "streaming"
                ? "bg-muted text-foreground"
                : "bg-muted text-muted-foreground"
          )}
        >
          {STATE_LABEL[exchange.state]}
        </span>
        {took ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {took}
          </span>
        ) : null}
        <HugeiconsIcon
          aria-hidden
          icon={ArrowDown01Icon}
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open/exchange:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 border-t px-3 py-3">
        <Section title="Sent to the model">
          <p className="text-xs text-muted-foreground">
            {exchange.request.trigger === "regenerate-message"
              ? "Retried"
              : "New message"}{" "}
            · {exchange.request.messages.length}{" "}
            {exchange.request.messages.length === 1 ? "message" : "messages"} in
            the chat, converted as the route does before calling the model.
          </p>
          {sent === undefined ? (
            <p className="text-sm text-muted-foreground">Converting…</p>
          ) : (
            <JsonBlock
              title={metadata?.model ?? exchange.request.model ?? "model"}
              value={sent}
            />
          )}
        </Section>

        <Section title="Thinking">
          <Prose
            text={thinking}
            empty="None. This model returned no reasoning for this reply."
          />
        </Section>

        <Section title="Reply">
          <Prose
            text={reply}
            empty={
              exchange.state === "streaming"
                ? "Waiting for the first word…"
                : "No text."
            }
          />
        </Section>

        {tools.length > 0 ? (
          <Section title="Tool calls">
            <JsonBlock title="tools" value={tools} />
          </Section>
        ) : null}

        <Section title="How it went">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {STATE_LABEL[exchange.state]}
              {exchange.httpStatus ? ` · HTTP ${exchange.httpStatus}` : ""}
            </dd>
            <dt className="text-muted-foreground">Finish reason</dt>
            <dd>{finishReason ?? "–"}</dd>
            <dt className="text-muted-foreground">First token</dt>
            <dd className="tabular-nums">
              {firstEvent ? seconds(firstEvent.ms) : "–"}
            </dd>
            <dt className="text-muted-foreground">Tokens</dt>
            <dd className="tabular-nums">
              {usage
                ? `${usage.inputTokens ?? "?"} in · ${usage.outputTokens ?? "?"} out`
                : "–"}
            </dd>
            {exchange.error ? (
              <>
                <dt className="text-muted-foreground">Error</dt>
                <dd className="break-words text-destructive">
                  {exchange.error}
                </dd>
              </>
            ) : null}
          </dl>
          {usage ? <JsonBlock title="usage" value={usage} /> : null}
        </Section>

        <Section title={`Stream (${exchange.events.length} events)`}>
          <CodeBlock size="sm" className="max-h-72">
            <CodeBlockContent>
              {exchange.events.map(({ ms, chunk }, index) => (
                <CodeBlockLine key={index}>
                  <span className="text-muted-foreground tabular-nums">
                    +{seconds(ms)}{" "}
                  </span>
                  {JSON.stringify(chunk, shortened)}
                </CodeBlockLine>
              ))}
            </CodeBlockContent>
          </CodeBlock>
        </Section>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * The bug button in the chat header, which opens and closes the right panel
 * that AiDebugPanel fills. Only in development, where requests are recorded.
 */
function AiDebugButton() {
  const { isOpen, toggle } = usePanels()
  const open = isOpen("right")

  if (process.env.NODE_ENV === "production") return null

  return (
    <TooltipIconButton
      data-slot="ai-debug-button"
      tooltip={open ? "Hide AI requests" : "AI requests"}
      aria-pressed={open}
      onClick={() => toggle("right")}
      className={cn("size-7", open && "bg-muted [&_svg]:text-foreground")}
    >
      <HugeiconsIcon icon={Bug01Icon} />
    </TooltipIconButton>
  )
}

/**
 * Every request this chat has made to the model, newest first: what was
 * sent, the reasoning and reply that came back, and each event of the
 * stream. Kept in memory, so a reload starts over.
 */
function AiDebugPanel({ chatId }: { chatId: string }) {
  const exchanges = React.useSyncExternalStore(
    subscribeExchanges,
    () => getExchanges(chatId),
    () => NO_EXCHANGES
  )

  return (
    <div data-slot="ai-debug-panel" className="flex min-w-0 flex-col gap-3 p-3">
      <p className="px-1 text-sm text-muted-foreground">
        What this chat sent to the model and what came back, newest first. Kept
        until the page reloads.
      </p>
      {exchanges.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Nothing yet. Send a message and its request shows up here.
        </p>
      ) : (
        exchanges
          .toReversed()
          .map((exchange, index) => (
            <ExchangeCard
              key={exchange.id}
              exchange={exchange}
              defaultOpen={index === 0}
            />
          ))
      )}
    </div>
  )
}

export { AiDebugButton, AiDebugPanel }
