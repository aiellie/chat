"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { ArrowUp02Icon, StopIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

function Chat({ id }: { id?: string }) {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id,
  })
  const [input, setInput] = React.useState("")
  const busy = status === "submitted" || status === "streaming"

  const submit = () => {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
              {messages.map((message) => {
                const text = message.parts
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("")
                const mine = message.role === "user"
                return (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={mine}
                  >
                    <Message align={mine ? "end" : "start"}>
                      <MessageContent>
                        <Bubble variant={mine ? "secondary" : "ghost"}>
                          <BubbleContent className="whitespace-pre-wrap">
                            {text}
                          </BubbleContent>
                        </Bubble>
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
                          onClick={() => regenerate()}
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

      <form
        className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <InputGroup>
          <InputGroupTextarea
            aria-label="Message"
            placeholder="Message"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line.
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                submit()
              }
            }}
            className="max-h-48"
          />
          <InputGroupAddon align="block-end" className="justify-end">
            {busy ? (
              <InputGroupButton
                variant="secondary"
                size="icon-sm"
                onClick={() => stop()}
              >
                <HugeiconsIcon icon={StopIcon} aria-hidden />
                <span className="sr-only">Stop</span>
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                disabled={!input.trim()}
              >
                <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden />
                <span className="sr-only">Send</span>
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  )
}

export { Chat }
