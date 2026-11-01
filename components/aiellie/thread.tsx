"use client"

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
import {
  MessageAction,
  MessageActions,
  MessageCopyAction,
  MessageMoreActions,
  MessageRateAction,
  type Rating,
  type Report,
} from "@/components/aiellie/message-actions"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import type { MessageMetadata } from "@/lib/model-messages"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

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
  error,
  onRetry,
  onRegenerate,
  onRate,
  onBranch,
  onReport,
}: {
  messages: UIMessage[]
  /** Whether the last message is a reply still coming in. */
  streaming?: boolean
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
              const metadata = message.metadata as MessageMetadata | undefined
              const sentAt = metadata?.createdAt
              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={mine}
                  className="pb-6"
                >
                  {sentAt !== undefined && firsts.has(message.id) ? (
                    <DateDivider at={sentAt} className="mb-6" />
                  ) : null}
                  <Message align={mine ? "end" : "start"}>
                    <MessageContent>
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
                      {text || files.length === 0 ? (
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
                              // arriving now is written out from its first word.
                              <Markdown streaming={live} revealInitial={live}>
                                {text}
                              </Markdown>
                            )}
                          </BubbleContent>
                        </Bubble>
                      ) : null}
                    </MessageContent>
                    {sentAt !== undefined || (!mine && !live) ? (
                      // Laid in the gap under the message, so showing it on
                      // hover moves nothing. Hovering it counts as hovering
                      // the message, so it shows as the pointer reaches it,
                      // from above or below. It shows too while a button in
                      // it has focus or its menu is open.
                      <MessageFooter className="absolute start-0 top-full gap-2 opacity-0 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 group-data-[align=end]/message:start-auto group-data-[align=end]/message:end-0 has-data-popup-open:opacity-100">
                        {/* A reply still being written has nothing to act on yet. */}
                        {!mine && !live ? (
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
