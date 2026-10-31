"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import { Composer } from "@/components/aiellie/composer"
import { Thread } from "@/components/aiellie/thread"
import { loadMessages, saveMessages } from "@/components/aiellie/thread-store"

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
    messages: loadMessages(id),
  })

  // Saved once a reply settles, not on every streamed token. A thread that
  // hasn't been sent to yet isn't saved at all.
  React.useEffect(() => {
    if (status === "streaming" || messages.length === 0) return
    saveMessages(id, messages)
  }, [id, messages, status])

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

export { Chat }
