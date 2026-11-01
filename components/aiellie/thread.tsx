"use client"

import type { UIMessage } from "ai"

import { AttachmentGroup } from "@/components/aiellie/attachment"
import { FileAttachment } from "@/components/aiellie/file-attachment"
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
  error,
  onRetry,
}: {
  messages: UIMessage[]
  /** Shows a bubble that retries the last message when pressed. */
  error?: Error
  onRetry?: () => void
}) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
            {messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")
              const files = message.parts.filter((part) => part.type === "file")
              const mine = message.role === "user"
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
                          <BubbleContent className="whitespace-pre-wrap">
                            {text}
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
