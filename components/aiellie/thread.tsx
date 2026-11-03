"use client"

import * as React from "react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ToolUIPart, UIMessage } from "ai"

import { WeatherCard } from "@/components/aiellie/weather-card"
import { EMAIL_TOOL, EmailApproval } from "@/components/aiellie/email-approval"
import { AttachmentGroup } from "@/components/aiellie/attachment"
import {
  DateDivider,
  dayOf,
  timeLabel,
} from "@/components/aiellie/date-divider"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import {
  isMemoryPart,
  memoryCallOf,
  MemoryTrace,
  type MemoryPart,
} from "@/components/aiellie/memory-trace"
import {
  planMarkdown,
  PlanReview,
  plansIn,
  type PlanCall,
  type PlanDecision,
} from "@/components/aiellie/plan-review"
import { Response } from "@/components/aiellie/response"
import { Reasoning } from "@/components/aiellie/reasoning"
import { Sources } from "@/components/aiellie/sources"
import { ThinkingIndicator } from "@/components/aiellie/thinking-indicator"
import { ThreadTranscript } from "@/components/aiellie/thread-transcript"
import { SpokenMark, VoiceDivider } from "@/components/aiellie/voice-divider"
import {
  citedFirst,
  searchesIn,
  WebSearch,
} from "@/components/aiellie/web-search"
import {
  MessageAction,
  MessageActions,
  MessageCopyAction,
  MessageMoreActions,
  MessageRateAction,
  MessageSaveAction,
  type Rating,
  type Report,
} from "@/components/aiellie/message-actions"
import { Bubble, BubbleContent } from "@/components/aiellie/bubble"
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/aiellie/message"
import type { MessageMetadata } from "@/lib/model-messages"
import { Button } from "@/components/ui/button"
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status"
import { cn } from "@/lib/utils"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/aiellie/message-scroller"

/**
 * A memory tool's part as its line. One cut short, as by stopping the reply,
 * never gets its answer, so it settles once the reply has.
 */
function MemoryCallLine({
  part,
  live,
  keptMemories,
  onForgetMemory,
}: {
  part: MemoryPart
  live: boolean
  keptMemories?: ReadonlySet<string>
  onForgetMemory?: (memoryId: string) => void
}) {
  const call = memoryCallOf(part)
  const id = call.memory?.id
  // Only a save offers Undo, and says so once its memory's gone.
  const saved = call.kind === "save" && !call.existing ? id : undefined
  const removed = !!saved && !!keptMemories && !keptMemories.has(saved)
  return (
    <MemoryTrace
      {...call}
      status={call.status === "running" && !live ? "stopped" : call.status}
      removed={removed}
      onUndo={saved && onForgetMemory ? () => onForgetMemory(saved) : undefined}
    />
  )
}

/**
 * The reason a reply failed, from its error: the first line of the message.
 * A request that never got an answer, or got a page of HTML back, has
 * nothing worth reading, so it says that instead.
 */
function reasonOf(error: Error) {
  if (error instanceof TypeError)
    return "The chat couldn't be reached. Check the connection, then retry."
  const line = error.message.trim().split("\n")[0]
  return line && !line.startsWith("<") ? line : "The reply failed."
}

const sentAtOf = (message: UIMessage) =>
  (message.metadata as MessageMetadata | undefined)?.createdAt

// The messages a date divider goes above: the first, and each that starts a
// new day. Messages from before timestamps were kept start none.
function firstsOfDay(messages: UIMessage[]) {
  const firsts = new Set<string>()
  let lastDay: number | undefined
  for (const message of messages) {
    const sentAt = sentAtOf(message)
    if (sentAt === undefined) continue
    if (dayOf(sentAt) !== lastDay) firsts.add(message.id)
    lastDay = dayOf(sentAt)
  }
  return firsts
}

// A reply's words split around the plans it proposed: those before each
// plan, then the rest after the last.
function wordsAround(message: UIMessage, plans: PlanCall[]) {
  let from = 0
  return [...plans.map((call) => call.index), message.parts.length].map(
    (at) => {
      const words = message.parts
        .slice(from, at)
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("")
      from = at + 1
      return words
    }
  )
}

const spokenOf = (message: UIMessage) =>
  (message.metadata as MessageMetadata | undefined)?.spoken

// Where each voice chat starts and ends: the first and last of its turns
// said aloud, with the chat's id and the model it was with.
function voiceChatsIn(messages: UIMessage[]) {
  const chats = new Map<
    string,
    { first: string; last: string; model: string }
  >()
  for (const message of messages) {
    const spoken = spokenOf(message)
    if (!spoken) continue
    const chat = chats.get(spoken.chat)
    if (chat) chat.last = message.id
    else
      chats.set(spoken.chat, {
        first: message.id,
        last: message.id,
        model: spoken.model,
      })
  }
  const starts = new Map<string, { chat: string; model: string }>()
  const ends = new Map<string, string>()
  for (const [chat, { first, last, model }] of chats) {
    starts.set(first, { chat, model })
    ends.set(last, chat)
  }
  return { starts, ends }
}

function Thread({
  messages,
  voiceChat,
  streaming = false,
  thinkingSince,
  error,
  onRetry,
  onRegenerate,
  onRate,
  onBranch,
  onReport,
  onPlanReview,
  onToolApproval,
  keptMemories,
  onForgetMemory,
  onSaveMemory,
}: {
  messages: UIMessage[]
  /** The voice chat going, by its id, which isn't marked as ended yet. */
  voiceChat?: string
  /** Whether a reply is on its way. Once it has begun, it's the last message. */
  streaming?: boolean
  /**
   * While a reply is on its way, when it was asked for. Until the reply has
   * something to show, the thread shows it's thinking.
   */
  thinkingSince?: number
  /**
   * Shows the reply failed, with the error's message as the reason, and a
   * Retry button with `onRetry`.
   */
  error?: Error
  onRetry?: () => void
  // Each reply action is left out without its handler.
  /** Asks for a reply again. */
  onRegenerate?: (messageId: string) => void
  /** Rates a reply, or clears its rating. */
  onRate?: (messageId: string, rating: Rating | undefined) => void
  /** Starts a new chat from the conversation up to this reply. */
  onBranch?: (messageId: string) => void
  /** Reports a reply. */
  onReport?: (messageId: string, report: Report) => void
  /**
   * Answers a plan the last reply proposed, by its tool call. Without it,
   * plans are read-only.
   */
  onPlanReview?: (toolCallId: string, decision: PlanDecision) => void
  /**
   * Answers a tool call waiting on the person's approval, like an email
   * before it's sent, by its approval id. Without it, approvals are
   * read-only.
   */
  onToolApproval?: (approvalId: string, approved: boolean) => void
  /**
   * The memories still kept, by id, so a save whose memory is gone says so.
   * Without it, every save reads as kept.
   */
  keptMemories?: ReadonlySet<string>
  /** Removes a memory a reply saved, as its Undo. Without it, there's no Undo. */
  onForgetMemory?: (memoryId: string) => void
  /**
   * Saves a message's text, as edited, to memory. Without it, messages have
   * no Save to memory.
   */
  onSaveMemory?: (messageId: string, text: string) => void | Promise<void>
}) {
  const firsts = firstsOfDay(messages)
  const voice = voiceChatsIn(messages)
  // The reply whose thinking is still being written out. Its words wait for
  // that, so the two aren't written at once.
  const [thinkingId, setThinkingId] = React.useState<string>()

  return (
    // The chat's header is glass over the top 40px, so the thread scrolls
    // under it: it starts below it, and a message brought to the top stops
    // clear of it.
    <MessageScrollerProvider autoScroll scrollMargin={40}>
      {/* A container, so the transcript shows by the thread's own width:
          only where it has a gutter beside the messages to sit in. */}
      <MessageScroller className="@container">
        <MessageScrollerViewport>
          {/* Items are spaced by their own bottom padding, not a gap: each
              clips what it paints to its box, and a message's time sits in
              that space. */}
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-0 px-4 pt-16 pb-0">
            {messages.map((message, index) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")
              const files = message.parts.filter((part) => part.type === "file")
              const mine = message.role === "user"
              const live = streaming && !mine && index === messages.length - 1
              const held = message.id === thinkingId
              const thoughts = message.parts.filter(
                (part) => part.type === "reasoning"
              )
              const reasoning = thoughts
                .map((part) => part.text)
                .filter(Boolean)
                .join("\n\n")
              const thinking =
                live && thoughts.some((part) => part.state === "streaming")
              const metadata = message.metadata as MessageMetadata | undefined
              const sentAt = metadata?.createdAt
              const web = mine ? undefined : searchesIn(message)
              // The pages cited first, in the order the reply cites them, so
              // its citations count up from 1 and match its sources.
              const sources = web ? citedFirst(web.found, text) : []
              const searching =
                live &&
                !!web?.searches.some((part) =>
                  ["input-streaming", "input-available"].includes(part.state)
                )
              const writing =
                live &&
                message.parts.some(
                  (part) => part.type === "text" && part.state === "streaming"
                )
              // The plans it proposed, each drawn where it was proposed, with
              // the words written before it above it.
              const plans = mine ? [] : plansIn(message)
              const words = wordsAround(message, plans)
              const reply = words[plans.length]
              const planning = live && plans.some((call) => call.writing)
              // Tools drawn as cards, which stand in for words when the
              // reply has none.
              const cards = message.parts.some(
                (part) =>
                  part.type === "tool-get_weather" ||
                  part.type === `tool-${EMAIL_TOOL}`
              )
              // What copying or reading the reply gives: its words with its
              // plans in place, as Markdown.
              const whole =
                plans.length === 0
                  ? text
                  : words
                      .flatMap((run, at) => [
                        run,
                        plans[at] ? planMarkdown(plans[at].plan) : "",
                      ])
                      .filter(Boolean)
                      .join("\n\n")
              // At work with nothing coming in to show for it: before its
              // first words, or while it reads what a search found.
              const waiting =
                live && !thinking && !searching && !writing && !planning
              const spoken = spokenOf(message)
              // A voice chat's marks are live while it's going.
              const spokenLive = !!spoken && spoken.chat === voiceChat
              const voiceStart = voice.starts.get(message.id)
              const voiceEnd = voice.ends.get(message.id)
              return (
                <React.Fragment key={message.id}>
                  <MessageScrollerItem
                    messageId={message.id}
                    scrollAnchor={mine}
                    // A reply's footer holds its actions, so it needs the room.
                    className={mine ? "pb-6" : "pb-8"}
                  >
                    {sentAt !== undefined && firsts.has(message.id) ? (
                      <DateDivider at={sentAt} className="mb-6" />
                    ) : null}
                    {voiceStart !== undefined ? (
                      <VoiceDivider
                        edge="start"
                        model={voiceStart.model}
                        live={voiceStart.chat === voiceChat}
                        className="mb-6"
                      />
                    ) : null}
                    <Message align={mine ? "end" : "start"}>
                      <MessageContent>
                        {/* Above the reply, as it came first. */}
                        {!mine && (reasoning || thinking) ? (
                          <Reasoning
                            text={reasoning}
                            streaming={thinking}
                            duration={metadata?.reasoningSeconds}
                            onThinkingChange={(on) =>
                              setThinkingId((current) =>
                                on
                                  ? message.id
                                  : current === message.id
                                    ? undefined
                                    : current
                              )
                            }
                          />
                        ) : null}
                        {web &&
                        (web.searches.length > 0 || web.found.length > 0) ? (
                          <WebSearch
                            queries={web.queries}
                            found={web.found}
                            searching={searching}
                            typing={
                              live &&
                              web.searches.at(-1)?.state === "input-streaming"
                            }
                          />
                        ) : null}
                        {message.parts.map((part) =>
                          isMemoryPart(part) ? (
                            <MemoryCallLine
                              key={(part as ToolUIPart).toolCallId}
                              part={part as MemoryPart}
                              live={live}
                              keptMemories={keptMemories}
                              onForgetMemory={onForgetMemory}
                            />
                          ) : part.type === "tool-get_weather" ? (
                            <WeatherCard key={part.toolCallId} part={part} />
                          ) : part.type === `tool-${EMAIL_TOOL}` ? (
                            // Only the last reply's request can be answered.
                            <EmailApproval
                              key={part.toolCallId}
                              part={part as ToolUIPart}
                              disabled={streaming}
                              onRespond={
                                index === messages.length - 1
                                  ? onToolApproval
                                  : undefined
                              }
                            />
                          ) : null
                        )}
                        {files.length > 0 ? (
                          <AttachmentGroup className="max-w-full">
                            {files.map((file, index) => (
                              <FileAttachment
                                key={index}
                                name={file.filename ?? "File"}
                                mediaType={file.mediaType}
                                src={file.url || undefined}
                              />
                            ))}
                          </AttachmentGroup>
                        ) : null}
                        {/* A plan waits on the person while it's the last
                          thing in the thread. */}
                        {!held
                          ? plans.map((call, at) => (
                              <React.Fragment key={call.toolCallId}>
                                {words[at] ? (
                                  <Bubble variant="ghost">
                                    <BubbleContent>
                                      <Response>{words[at]}</Response>
                                    </BubbleContent>
                                  </Bubble>
                                ) : null}
                                <PlanReview
                                  plan={call.plan}
                                  decision={call.decision}
                                  writing={live && call.writing}
                                  error={call.error}
                                  disabled={streaming}
                                  onReview={
                                    onPlanReview &&
                                    call.open &&
                                    index === messages.length - 1
                                      ? (decision) =>
                                          onPlanReview(
                                            call.toolCallId,
                                            decision
                                          )
                                      : undefined
                                  }
                                />
                              </React.Fragment>
                            ))
                          : null}
                        {/* A reply with no words yet, or none it may show yet,
                          shows it's thinking instead. */}
                        {!held &&
                        (reply ||
                          (files.length === 0 &&
                            !live &&
                            plans.length === 0 &&
                            !cards)) ? (
                          <Bubble variant={mine ? "secondary" : "ghost"}>
                            {/* Markdown lays out its own lines, so only what
                              the person typed keeps theirs as written. */}
                            <BubbleContent
                              className={cn(
                                mine && "whitespace-pre-wrap",
                                spoken && "flex items-start gap-2"
                              )}
                            >
                              {spoken ? (
                                // On the first line, which runs about 23px.
                                <SpokenMark
                                  live={spokenLive}
                                  className="mt-1 shrink-0"
                                />
                              ) : null}
                              {mine ? (
                                text
                              ) : (
                                // Each word fades in as it arrives; replies
                                // loaded from history show at once.
                                <Response
                                  streaming={live}
                                  citations={sources.map((page) => ({
                                    url: page.url,
                                    title: page.title,
                                    description: page.snippet,
                                  }))}
                                >
                                  {reply}
                                </Response>
                              )}
                            </BubbleContent>
                          </Bubble>
                        ) : null}
                        {waiting ? (
                          // Gives way to a trace line above it that's still at
                          // work, like thinking still being written out.
                          <ThinkingIndicator
                            startedAt={thinkingSince}
                            className="in-[[data-slot=message-content]:has([data-status=running])]:hidden"
                          />
                        ) : null}
                        {/* The pages the reply drew on, once it's written. */}
                        {sources.length > 0 && !live && !held ? (
                          <Sources sources={sources} />
                        ) : null}
                      </MessageContent>
                      {/* A reply's footer, time and all, waits until it's
                        written: before then there's nothing to act on. */}
                      {(mine ? sentAt !== undefined : !live && !held) ? (
                        // Laid in the gap under the message, so showing it on
                        // hover moves nothing, and padded rather than spaced
                        // clear of it, so the pointer crossing to it never
                        // leaves the message. Hovering it counts as hovering
                        // the message, so it shows as the pointer reaches it,
                        // from above or below. It shows too while a button in
                        // it has focus or its menu is open.
                        <MessageFooter className="absolute start-0 top-full gap-2 pt-2 opacity-0 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 group-data-[align=end]/message:start-auto group-data-[align=end]/message:end-0 has-data-popup-open:opacity-100">
                          {mine && onSaveMemory ? (
                            <MessageActions>
                              <MessageSaveAction
                                text={text}
                                onSave={(saved) =>
                                  onSaveMemory(message.id, saved)
                                }
                              />
                            </MessageActions>
                          ) : null}
                          {!mine ? (
                            <MessageActions>
                              <MessageCopyAction value={whole} />
                              {onSaveMemory ? (
                                <MessageSaveAction
                                  text={whole}
                                  onSave={(saved) =>
                                    onSaveMemory(message.id, saved)
                                  }
                                />
                              ) : null}
                              {onRate ? (
                                <>
                                  <MessageRateAction
                                    value="up"
                                    pressed={metadata?.rating === "up"}
                                    onPressedChange={(on) =>
                                      onRate(message.id, on ? "up" : undefined)
                                    }
                                  />
                                  <MessageRateAction
                                    value="down"
                                    pressed={metadata?.rating === "down"}
                                    onPressedChange={(on) =>
                                      onRate(
                                        message.id,
                                        on ? "down" : undefined
                                      )
                                    }
                                  />
                                </>
                              ) : null}
                              {onRegenerate ? (
                                <MessageAction
                                  tooltip="Regenerate"
                                  disabled={streaming}
                                  onClick={() => onRegenerate(message.id)}
                                >
                                  <HugeiconsIcon
                                    aria-hidden
                                    icon={RefreshIcon}
                                  />
                                </MessageAction>
                              ) : null}
                              <MessageMoreActions
                                text={whole}
                                onBranch={
                                  onBranch
                                    ? () => onBranch(message.id)
                                    : undefined
                                }
                                onReport={
                                  onReport
                                    ? (report) => onReport(message.id, report)
                                    : undefined
                                }
                                reported={metadata?.report !== undefined}
                              />
                            </MessageActions>
                          ) : null}
                          {sentAt !== undefined ? (
                            <time dateTime={new Date(sentAt).toISOString()}>
                              {timeLabel(sentAt)}
                            </time>
                          ) : null}
                        </MessageFooter>
                      ) : null}
                    </Message>
                  </MessageScrollerItem>
                  {/* After its last turn said aloud, once it's over. */}
                  {voiceEnd !== undefined && voiceEnd !== voiceChat ? (
                    <MessageScrollerItem className="pb-8">
                      <VoiceDivider edge="end" />
                    </MessageScrollerItem>
                  ) : null}
                </React.Fragment>
              )
            })}
            {/* Asked, and nothing back yet. */}
            {thinkingSince !== undefined && messages.at(-1)?.role === "user" ? (
              <MessageScrollerItem className="pb-6">
                <Message>
                  <MessageContent>
                    <ThinkingIndicator startedAt={thinkingSince} />
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}
            {/* "Failed" alone doesn't say what to do, so the reason goes
                beside it, then a way to try again. */}
            {error ? (
              <MessageScrollerItem className="pb-6">
                <Message>
                  <MessageContent>
                    <div
                      role="alert"
                      data-slot="reply-failed"
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                    >
                      <Status variant="destructive">
                        <StatusIndicator />
                        <StatusLabel>Failed</StatusLabel>
                      </Status>
                      <span className="text-muted-foreground">
                        {reasonOf(error)}
                      </span>
                      {onRetry ? (
                        <Button variant="ghost" size="xs" onClick={onRetry}>
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
        <ThreadTranscript messages={messages} />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

export { Thread }
