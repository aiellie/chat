"use client"

import type { UIMessage } from "ai"

import { AttachmentGroup } from "@/components/aiellie/attachment"
import {
  DateDivider,
  dayOf,
  timeLabel,
} from "@/components/aiellie/date-divider"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import { Markdown } from "@/components/aiellie/markdown"
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
}: {
  messages: UIMessage[]
  /** Whether the last message is a reply still coming in. */
  streaming?: boolean
  /** Shows a bubble that retries the last message when pressed. */
  error?: Error
  onRetry?: () => void
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
              const sentAt = sentAtOf(message)
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
                    {sentAt !== undefined ? (
                      // Laid in the gap under the message, so showing it on
                      // hover moves nothing.
                      <MessageFooter className="pointer-events-none absolute start-0 top-full mt-1 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-data-[align=end]/message:start-auto group-data-[align=end]/message:end-0">
                        <time dateTime={new Date(sentAt).toISOString()}>
                          {timeLabel(sentAt)}
                        </time>
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
