"use client"

import { useChat } from "@ai-sdk/react"

import { Composer } from "@/components/aiellie/composer"
import { Thread } from "@/components/aiellie/thread"

function Chat({ id }: { id?: string }) {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id,
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Thread messages={messages} error={error} onRetry={() => regenerate()} />
      <Composer
        busy={status === "submitted" || status === "streaming"}
        onSend={(text) => sendMessage({ text })}
        onStop={() => stop()}
      />
    </div>
  )
}

export { Chat }
