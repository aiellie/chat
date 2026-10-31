"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"

import { Composer } from "@/components/aiellie/composer"
import { Thread } from "@/components/aiellie/thread"

// Each thread's messages, kept for the session so switching threads doesn't
// lose them. Nothing is saved across a reload yet.
const threadMessages = new Map<string, UIMessage[]>()

function Chat({
  id,
  onFirstMessage,
}: {
  id: string
  /** Called as the first message goes out, to create the thread. */
  onFirstMessage?: (id: string, text: string) => void
}) {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id,
    messages: threadMessages.get(id),
  })

  React.useEffect(() => {
    threadMessages.set(id, messages)
  }, [id, messages])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Thread messages={messages} error={error} onRetry={() => regenerate()} />
      <Composer
        busy={status === "submitted" || status === "streaming"}
        onSend={(text) => {
          if (messages.length === 0) onFirstMessage?.(id, text)
          sendMessage({ text })
        }}
        onStop={() => stop()}
      />
    </div>
  )
}

export { Chat, threadMessages }
