"use client"

import type { UIMessage } from "ai"

import { AttachmentGroup } from "@/components/aiellie/attachment"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import { StreamMarkdown } from "@/components/aiellie/stream-markdown"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

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
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
            {messages.map((message, index) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")
              const files = message.parts.filter((part) => part.type === "file")
              const mine = message.role === "user"
              const live = streaming && !mine && index === messages.length - 1
              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={mine}
                >
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
                              <StreamMarkdown
                                text={text}
                                streaming={live}
                                revealInitial={live}
                              />
                            )}
                          </BubbleContent>
                        </Bubble>
                      ) : null}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )
            })}
            {error ? (
              <MessageScrollerItem>
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
