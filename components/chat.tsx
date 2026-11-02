"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { GlobalSearchIcon } from "@hugeicons/core-free-icons"
import { DefaultChatTransport, type UIMessage } from "ai"

import {
  Composer,
  ComposerAddFiles,
  ComposerAddFolder,
  ComposerAddMenu,
  ComposerAddScreenshot,
  ComposerDictate,
  ComposerEmoji,
  ComposerFooter,
  ComposerHeader,
  ComposerInput,
  ComposerSubmit,
  ComposerToggle,
} from "@/components/aiellie/composer"
import { recordingFetch } from "@/components/aiellie/ai-debug-store"
import { AttachmentGroup } from "@/components/aiellie/attachment"
import {
  ChatEmpty,
  ChatEmptyDescription,
  ChatEmptyTitle,
} from "@/components/aiellie/chat-empty"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import { ContextMeter, contextOf } from "@/components/aiellie/context-meter"
import { ModelSelector } from "@/components/aiellie/model-selector"
import { Thread } from "@/components/aiellie/thread"
import {
  getReplies,
  loadMessages,
  saveMessages,
  setReplying,
  subscribeReplies,
} from "@/components/aiellie/thread-store"
import {
  mediaTypeOf,
  pathOf,
  readableFiles,
  toFileParts,
} from "@/lib/attachments"
import { apiKeyHeaders, onApiKeysChange } from "@/lib/api-keys"
import type { MessageMetadata } from "@/lib/model-messages"
import { asksToSearch } from "@/lib/search-intent"
import {
  defaultEffort,
  defaultModel,
  type Effort,
  type ModelOption,
} from "@/lib/models"

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
  compact = false,
}: {
  id: string
  /** Called as the first message goes out, to create the thread. */
  onFirstMessage?: (id: string, text: string) => void
  /** Starts a new chat with these messages. Without it, replies can't branch. */
  onBranch?: (messages: UIMessage[]) => void
  /** Laid out for a small window, as quick chat's: tighter, without the footnote. */
  compact?: boolean
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
  const [effortPick, setEffort] = React.useState<Effort>()
  const [contextPick, setContext] = React.useState<number>()
  const [fastPick, setFast] = React.useState(false)
  const [search, setSearch] = React.useState(false)

  // What's picked holds only where the model offers it; otherwise it takes
  // the model's default: medium effort, its full context, and not fast.
  const option = models.find((candidate) => candidate.id === model)
  const efforts = option?.efforts
  const effort = efforts
    ? effortPick && efforts.includes(effortPick)
      ? effortPick
      : defaultEffort(efforts)
    : undefined
  const contexts = option?.contexts
  const context = contexts
    ? contextPick && contexts.includes(contextPick)
      ? contextPick
      : contexts.at(-1)
    : undefined
  const fast = fastPick && option?.fastId !== undefined
  // Sent with every request, for the route to run the model as picked.
  const body = {
    model: fast ? option?.fastId : model,
    effort,
    context,
    search,
  }

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

  // While a reply is on its way, the thread and the sidebar show it's
  // thinking, counting from when it was asked for. Leaving the chat lets the
  // reply go, so the mark goes with it.
  const busy = status === "submitted" || status === "streaming"
  React.useEffect(() => {
    if (!busy) return
    setReplying(id, Date.now())
    return () => setReplying(id)
  }, [id, busy])
  const thinkingSince = React.useSyncExternalStore(
    subscribeReplies,
    () => getReplies().get(id),
    () => undefined
  )

  // Saved once a reply settles, not on every streamed token. A thread that
  // hasn't been sent to yet isn't saved at all.
  React.useEffect(() => {
    if (status === "streaming" || messages.length === 0) return
    saveMessages(id, messages)
  }, [id, messages, status])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* A new chat, on the home page, has no thread to show yet. */}
      {messages.length === 0 ? (
        <ChatEmpty>
          <ChatEmptyTitle className={compact ? "text-lg" : undefined}>
            How can I help?
          </ChatEmptyTitle>
          <ChatEmptyDescription>
            Ask Ellie anything, or add files to talk through.
          </ChatEmptyDescription>
        </ChatEmpty>
      ) : (
        <Thread
          messages={messages}
          // A reply has begun before its first words, while the status still
          // reads "submitted".
          streaming={busy}
          thinkingSince={thinkingSince}
          error={error}
          onRetry={() => regenerate({ body })}
          onRegenerate={(messageId) => regenerate({ messageId, body })}
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
                      messages.findIndex(
                        (message) => message.id === messageId
                      ) + 1
                    )
                  )
              : undefined
          }
        />
      )}
      <div
        className={
          compact
            ? "w-full shrink-0 px-3 pb-3"
            : "mx-auto w-full max-w-3xl shrink-0 px-4 pb-4"
        }
      >
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
            // Asking to search turns search on, for this message and those
            // after it, as the toggle would.
            const searching = search || asksToSearch(text)
            if (searching !== search) setSearch(true)
            // An empty text part is refused by some providers, so files can go alone.
            sendMessage(
              files.length === 0
                ? { text, metadata }
                : text
                  ? { text, files, metadata }
                  : { files, metadata },
              { body: { ...body, search: searching } }
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
            <ComposerEmoji />
            <ComposerToggle
              pressed={search}
              onPressedChange={setSearch}
              icon={GlobalSearchIcon}
              label="Search"
              tooltip="Search the web"
            />
            {models.length > 0 ? (
              <ModelSelector
                models={models}
                value={model}
                onValueChange={setModel}
                effort={effort}
                onEffortChange={setEffort}
                context={context}
                onContextChange={setContext}
                fast={fast}
                onFastChange={setFast}
              />
            ) : null}
            <div className="flex-1" />
            {/* Measured against the context size picked, where there's one. */}
            <ContextMeter
              {...contextOf(messages, models, model)}
              {...(context ? { limit: context } : {})}
            />
            <ComposerDictate />
            <ComposerSubmit />
          </ComposerFooter>
        </Composer>
        {compact ? null : (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Ellie is an AI and can make mistakes.
          </p>
        )}
      </div>
    </div>
  )
}

export { Chat }
