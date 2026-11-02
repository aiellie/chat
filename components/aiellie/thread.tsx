"use client"

import * as React from "react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import { AttachmentGroup } from "@/components/aiellie/attachment"
import {
  DateDivider,
  dayOf,
  timeLabel,
} from "@/components/aiellie/date-divider"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import { Markdown } from "@/components/aiellie/markdown"
import { Reasoning } from "@/components/aiellie/reasoning"
import { Sources } from "@/components/aiellie/sources"
import { ThinkingIndicator } from "@/components/aiellie/thinking-indicator"
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
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/aiellie/message-scroller"

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

function Thread({
  messages,
  streaming = false,
  thinkingSince,
  error,
  onRetry,
  onRegenerate,
  onRate,
  onBranch,
  onReport,
}: {
  messages: UIMessage[]
  /** Whether a reply is on its way. Once it has begun, it's the last message. */
  streaming?: boolean
  /**
   * While a reply is on its way, when it was asked for. Until the reply has
   * something to show, the thread shows it's thinking.
   */
  thinkingSince?: number
  /** Shows a bubble that retries the last message when pressed. */
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
}) {
  const firsts = firstsOfDay(messages)
  // The reply whose thinking is still being written out. Its words wait for
  // that, so the two aren't written at once.
  const [thinkingId, setThinkingId] = React.useState<string>()
  // The reply that came in while the thread was open. It writes itself out
  // even when all of it has arrived by the time it's shown.
  const last = messages.at(-1)
  const liveId = streaming && last?.role === "assistant" ? last.id : undefined
  const [freshId, setFreshId] = React.useState(liveId)
  if (liveId !== undefined && liveId !== freshId) setFreshId(liveId)

  return (
    // The chat's header is glass over the top 40px, so the thread scrolls
    // under it: it starts below it, and a message brought to the top stops
    // clear of it.
    <MessageScrollerProvider autoScroll scrollMargin={40}>
      <MessageScroller>
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
              // At work with nothing coming in to show for it: before its
              // first words, or while it reads what a search found.
              const waiting = live && !thinking && !searching && !writing
              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={mine}
                  // A reply's footer holds its actions, so it needs the room.
                  className={mine ? "pb-6" : "pb-8"}
                >
                  {sentAt !== undefined && firsts.has(message.id) ? (
                    <DateDivider at={sentAt} className="mb-6" />
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
                      {/* A reply with no words yet, or none it may show yet,
                          shows it's thinking instead. */}
                      {!held && (text || (files.length === 0 && !live)) ? (
                        <Bubble variant={mine ? "secondary" : "ghost"}>
                          {/* Markdown lays out its own lines, so only what
                              the person typed keeps theirs as written. */}
                          <BubbleContent
                            className={mine ? "whitespace-pre-wrap" : undefined}
                          >
                            {mine ? (
                              text
                            ) : (
                              // Replies loaded from history show at once; one
                              // that came in now is written out from its first
                              // word, even after waiting on its thinking.
                              <Markdown
                                streaming={live}
                                revealInitial={message.id === freshId}
                                citations={sources.map((page) => ({
                                  url: page.url,
                                  title: page.title,
                                  description: page.snippet,
                                }))}
                              >
                                {text}
                              </Markdown>
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
                        {!mine ? (
                          <MessageActions>
                            <MessageCopyAction value={text} />
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
                                    onRate(message.id, on ? "down" : undefined)
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
                                <HugeiconsIcon aria-hidden icon={RefreshIcon} />
                              </MessageAction>
                            ) : null}
                            <MessageMoreActions
                              text={text}
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
            {error ? (
              <MessageScrollerItem className="pb-6">
                <Message>
                  <MessageContent>
                    <Bubble variant="destructive">
                      <BubbleContent
                        render={<button type="button" />}
                        onClick={onRetry}
                      >
                        Something went wrong. Try again.
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

export { Thread }
