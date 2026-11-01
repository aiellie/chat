"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"

import {
  Composer,
  ComposerFooter,
  ComposerInput,
  ComposerSubmit,
} from "@/components/aiellie/composer"
import { ModelSelector } from "@/components/aiellie/model-selector"
import { Thread } from "@/components/aiellie/thread"
import { loadMessages, saveMessages } from "@/components/aiellie/thread-store"
import { defaultModel, type ModelOption } from "@/lib/models"

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
  const [model, setModel] = React.useState(defaultModel)
  const [models, setModels] = React.useState<ModelOption[]>([])

  // Until the gateway answers there's nothing to pick from, so the selector
  // stays hidden and messages go to the default.
  React.useEffect(() => {
    let cancelled = false
    fetch("/api/models")
      .then((response) => (response.ok ? response.json() : []))
      .then((list: ModelOption[]) => {
        if (!cancelled) setModels(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Saved once a reply settles, not on every streamed token. A thread that
  // hasn't been sent to yet isn't saved at all.
  React.useEffect(() => {
    if (status === "streaming" || messages.length === 0) return
    saveMessages(id, messages)
  }, [id, messages, status])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Thread
        messages={messages}
        error={error}
        onRetry={() => regenerate({ body: { model } })}
      />
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        <Composer
          status={status}
          onSubmit={(text) => {
            if (messages.length === 0) onFirstMessage?.(id, text)
            sendMessage({ text }, { body: { model } })
          }}
          onStop={() => stop()}
        >
          <ComposerInput />
          <ComposerFooter>
            {models.length > 0 ? (
              <ModelSelector
                models={models}
                value={model}
                onValueChange={setModel}
                className="me-auto"
              />
            ) : null}
            <ComposerSubmit />
          </ComposerFooter>
        </Composer>
      </div>
    </div>
  )
}

export { Chat }
