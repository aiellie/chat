"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"

import {
  Composer,
  ComposerAddFiles,
  ComposerAddFolder,
  ComposerAddMenu,
  ComposerAddScreenshot,
  ComposerDictate,
  ComposerFooter,
  ComposerHeader,
  ComposerInput,
  ComposerSubmit,
} from "@/components/aiellie/composer"
import { recordingFetch } from "@/components/aiellie/ai-debug-store"
import { AttachmentGroup } from "@/components/aiellie/attachment"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import { ContextMeter, contextOf } from "@/components/aiellie/context-meter"
import { ModelSelector } from "@/components/aiellie/model-selector"
import { Thread } from "@/components/aiellie/thread"
import { loadMessages, saveMessages } from "@/components/aiellie/thread-store"
import {
  mediaTypeOf,
  pathOf,
  readableFiles,
  toFileParts,
} from "@/lib/attachments"
import { apiKeyHeaders, onApiKeysChange } from "@/lib/api-keys"
import type { MessageMetadata } from "@/lib/model-messages"
import { defaultModel, type ModelOption } from "@/lib/models"

// A picked file waiting to go out with the next message. Its URL draws its
// thumbnail and opens it to preview, copy or download.
type PendingFile = { id: string; file: File; url: string }

function revoke(files: PendingFile[]) {
  for (const { url } of files) URL.revokeObjectURL(url)
}

// In development every request and reply is recorded for the AI debug panel.
// API keys from the dialog go with every request, read fresh each time.
const transport = new DefaultChatTransport({
  fetch: process.env.NODE_ENV === "production" ? undefined : recordingFetch,
  headers: apiKeyHeaders,
})

function Chat({
  id,
  onFirstMessage,
  onBranch,
}: {
  id: string
  /** Called as the first message goes out, to create the thread. */
  onFirstMessage?: (id: string, text: string) => void
  /** Starts a new chat with these messages. Without it, replies can't branch. */
  onBranch?: (messages: UIMessage[]) => void
}) {
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
  } = useChat({
    id,
    messages: loadMessages(id),
    transport,
  })

  // Ratings and reports live on the message, so they're saved with the chat.
  const annotate = (messageId: string, patch: MessageMetadata) =>
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              metadata: {
                ...(message.metadata as MessageMetadata | undefined),
                ...patch,
              },
            }
          : message
      )
    )
  const [model, setModel] = React.useState(defaultModel)
  const [models, setModels] = React.useState<ModelOption[]>([])
  const [pending, setPending] = React.useState<PendingFile[]>([])

  const addFiles = async (files: File[]) => {
    const readable = await readableFiles(files)
    setPending((current) => [
      ...current,
      ...readable.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ])
  }

  const removeFile = (id: string) => {
    revoke(pending.filter((item) => item.id === id))
    setPending((current) => current.filter((item) => item.id !== id))
  }

  // Previews still waiting when the chat goes away are let go with it.
  const pendingRef = React.useRef(pending)
  React.useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  React.useEffect(() => () => revoke(pendingRef.current), [])

  // Until the gateway answers there's nothing to pick from, so the selector
  // stays hidden and messages go to the default.
  // A new Gateway key can offer other models, so the list is fetched again
  // when the keys change.
  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch("/api/models", { headers: apiKeyHeaders() })
        .then((response) => (response.ok ? response.json() : []))
        .then((list: ModelOption[]) => {
          if (!cancelled) setModels(list)
        })
        .catch(() => {})
    load()
    const stop = onApiKeysChange(load)
    return () => {
      cancelled = true
      stop()
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
        streaming={status === "streaming"}
        error={error}
        onRetry={() => regenerate({ body: { model } })}
        onRegenerate={(messageId) => regenerate({ messageId, body: { model } })}
        onRate={(messageId, rating) => annotate(messageId, { rating })}
        onReport={(messageId, report) =>
          annotate(messageId, { report: { ...report, at: Date.now() } })
        }
        onBranch={
          onBranch
            ? (messageId) =>
                onBranch(
                  messages.slice(
                    0,
                    messages.findIndex((message) => message.id === messageId) +
                      1
                  )
                )
            : undefined
        }
      />
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        <ComposerHeader open={pending.length > 0}>
          <AttachmentGroup>
            {pending.map((item) => (
              <FileAttachment
                key={item.id}
                name={pathOf(item.file)}
                mediaType={mediaTypeOf(item.file)}
                size={item.file.size}
                src={item.url}
                onRemove={() => removeFile(item.id)}
              />
            ))}
          </AttachmentGroup>
        </ComposerHeader>
        <Composer
          status={status}
          hasAttachments={pending.length > 0}
          onFilesAdd={addFiles}
          onSubmit={async (text) => {
            const sent = pending
            setPending([])
            if (messages.length === 0)
              onFirstMessage?.(id, text || sent[0].file.name)
            const files = await toFileParts(sent.map((item) => item.file))
            revoke(sent)
            // When it was sent, for its timestamp in the thread.
            const metadata: MessageMetadata = { createdAt: Date.now() }
            // An empty text part is refused by some providers, so files can go alone.
            sendMessage(
              files.length === 0
                ? { text, metadata }
                : text
                  ? { text, files, metadata }
                  : { files, metadata },
              { body: { model } }
            )
          }}
          onStop={() => stop()}
        >
          <ComposerInput />
          <ComposerFooter>
            <ComposerAddMenu>
              <ComposerAddFiles />
              <ComposerAddFolder />
              <ComposerAddScreenshot />
            </ComposerAddMenu>
            {models.length > 0 ? (
              <ModelSelector
                models={models}
                value={model}
                onValueChange={setModel}
              />
            ) : null}
            <div className="flex-1" />
            <ContextMeter {...contextOf(messages, models, model)} />
            <ComposerDictate />
            <ComposerSubmit />
          </ComposerFooter>
        </Composer>
      </div>
    </div>
  )
}

export { Chat }
