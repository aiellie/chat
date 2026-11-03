"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { Bookmark02Icon } from "@hugeicons/core-free-icons"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai"

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
} from "@/components/aiellie/composer"
import { recordingFetch } from "@/components/ai-debug-store"
import { AttachmentGroup } from "@/components/aiellie/attachment"
import {
  ChatEmpty,
  ChatEmptyDescription,
  ChatEmptyTitle,
} from "@/components/aiellie/chat-empty"
import { FileAttachment } from "@/components/aiellie/file-attachment"
import { ContextMeter, contextOf } from "@/components/aiellie/context-meter"
import { ModelSelector } from "@/components/aiellie/model-selector"
import { PLAN_TOOL, planApproved } from "@/components/aiellie/plan-review"
import { Suggestion, Suggestions } from "@/components/aiellie/suggestions"
import { SelectionToolbar } from "@/components/aiellie/selection-toolbar"
import { Thread } from "@/components/aiellie/thread"
import { VoiceChat } from "@/components/voice-chat"
import {
  createMemory,
  deleteMemory,
  listMemories,
  searchMemories,
  subscribeMemories,
} from "@/components/memory-store"
import {
  getReplies,
  loadMessages,
  saveMessages,
  setReplying,
  subscribeReplies,
} from "@/components/thread-store"
import {
  mediaTypeOf,
  pathOf,
  readableFiles,
  toFileParts,
} from "@/lib/attachments"
import { apiKeyHeaders, onApiKeysChange } from "@/lib/api-keys"
import type { MessageMetadata } from "@/lib/model-messages"
import { TOOLS } from "@/lib/tools/catalog"
import { RECALL_MEMORY_TOOL, SAVE_MEMORY_TOOL } from "@/lib/tools/memory"
import { ToolMark } from "@/components/tool-mark"
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

const wordsOf = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("")

/**
 * The thread with these spoken turns put in, each just before the next one
 * said after it that's already there, or else at the end. A turn's words can
 * be transcribed after the reply to them is in. Those already there take
 * any words transcribed since, keeping the rest, like a rating.
 */
function withSpoken(
  thread: UIMessage[],
  spoken: UIMessage[],
  adding: Set<string>
) {
  const result = [...thread]
  const has = (id: string) => result.some((message) => message.id === id)
  spoken.forEach((message, index) => {
    const there = result.findIndex((other) => other.id === message.id)
    if (there !== -1) {
      result[there] = { ...result[there], parts: message.parts }
      return
    }
    if (!adding.has(message.id)) return
    const next = spoken.slice(index + 1).find((later) => has(later.id))
    result.splice(
      next ? result.findIndex((other) => other.id === next.id) : result.length,
      0,
      message
    )
  })
  return result
}

const MEMORY_TOOLS = [RECALL_MEMORY_TOOL, SAVE_MEMORY_TOOL]

/**
 * Answers a memory tool from the store in this browser: what matched the
 * query, or the memory as saved. The memory line in the thread draws these.
 */
async function answerMemory(tool: string, input: unknown, chatId: string) {
  if (tool === RECALL_MEMORY_TOOL) {
    const { query } = input as { query: string }
    const found = await searchMemories(query)
    return {
      memories: found.map(({ id, text, savedBy, createdAt }) => ({
        id,
        text,
        savedBy,
        savedAt: new Date(createdAt).toISOString().slice(0, 10),
      })),
    }
  }
  const { text } = input as { text: string }
  const { id, text: saved } = await createMemory({
    text,
    savedBy: "agent",
    chatId,
  })
  return { memory: { id, text: saved } }
}

/**
 * Whether the reply's latest step used memory and every tool in it has its
 * answer, so the model can carry on with what it recalled or saved.
 */
function memoryAnswered({ messages }: { messages: UIMessage[] }) {
  const message = messages.at(-1)
  if (message?.role !== "assistant") return false
  const step = message.parts.slice(
    message.parts.findLastIndex((part) => part.type === "step-start") + 1
  )
  const tools = step.filter((part) => part.type.startsWith("tool-"))
  return (
    tools.some((part) => MEMORY_TOOLS.includes(part.type.slice(5))) &&
    tools.every(
      (part) =>
        "state" in part &&
        (part.state === "output-available" || part.state === "output-error")
    )
  )
}

// When a message was sent, for its timestamp in the thread.
const sentNow = (): MessageMetadata => ({ createdAt: Date.now() })

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
  // The model as picked, for a reply that carries on after a memory tool is
  // answered. Kept current below, once it's worked out.
  const bodyRef = React.useRef<object>(undefined)
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    addToolOutput,
    addToolApprovalResponse,
  } = useChat({
    id,
    messages: loadMessages(id),
    transport,
    // Memories live in this browser, so the chat answers the memory tools
    // itself. Not awaited, as the SDK asks, so the reply can carry on.
    onToolCall: async ({ toolCall }) => {
      if (!MEMORY_TOOLS.includes(toolCall.toolName)) return
      const { toolName: tool, toolCallId } = toolCall
      const options = { body: bodyRef.current }
      try {
        const output = await answerMemory(tool, toolCall.input, id)
        addToolOutput({ tool, toolCallId, output, options })
      } catch {
        addToolOutput({
          tool,
          toolCallId,
          state: "output-error",
          errorText: "This browser's storage couldn't be read.",
          options,
        })
      }
    },
    // Approving a plan sends the chat on, for the model to carry it out,
    // answering an approval (an email, say) sends it on to run or not, and
    // an answered memory tool sends it on with what was recalled or saved.
    sendAutomaticallyWhen: (options) =>
      planApproved(options) ||
      memoryAnswered(options) ||
      lastAssistantMessageIsCompleteWithApprovalResponses(options),
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
  // The memories still kept, by id, so a save undone here, or removed on the
  // Memory page, says so in the thread.
  const [kept, setKept] = React.useState<ReadonlySet<string>>()
  React.useEffect(() => {
    const load = () =>
      listMemories().then((all) =>
        setKept(new Set(all.map((memory) => memory.id)))
      )
    load()
    return subscribeMemories(load)
  }, [])
  const [pending, setPending] = React.useState<PendingFile[]>([])
  // What's in the composer, held here so a highlight's Reply can quote into
  // it.
  const [draft, setDraft] = React.useState("")
  const composerInput = React.useRef<HTMLTextAreaElement>(null)
  // Quotes the text above whatever's being written, and puts the caret at
  // the end, to write the reply.
  const replyTo = (text: string) => {
    const quote = text
      .split("\n")
      .map((line) => `> ${line}`.trimEnd())
      .join("\n")
    setDraft((current) => `${quote}\n\n${current}`)
    requestAnimationFrame(() => {
      const input = composerInput.current
      if (!input) return
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    })
  }
  const [effortPick, setEffort] = React.useState<Effort>()
  const [contextPick, setContext] = React.useState<number>()
  const [fastPick, setFast] = React.useState(false)
  // The voice chat going, if one is, and the realtime model it's with: the
  // one picked when it started, whatever's picked since. One that's ending
  // has hung up and stays only while its orb folds away.
  const [voice, setVoice] = React.useState<{
    id: string
    model: NonNullable<ModelOption["voice"]>
    ending?: boolean
  }>()
  const talking = voice && !voice.ending ? voice : undefined
  // Gone once its row has folded shut, 280 ms.
  React.useEffect(() => {
    if (!voice?.ending) return
    const timer = setTimeout(() => setVoice(undefined), 280)
    return () => clearTimeout(timer)
  }, [voice])
  // Every turn said in voice chats here, in the order said, and those of
  // them already put in the thread, which aren't put in again even if
  // they're later replaced, as by regenerating.
  const [spoken, setSpoken] = React.useState<UIMessage[]>([])
  const added = React.useRef(new Set<string>())

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
  }
  React.useEffect(() => {
    bodyRef.current = body
  })

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

  // Sends a message with the files waiting to go, as the composer does and a
  // suggestion does.
  const send = async (text: string) => {
    const sent = pending
    setPending([])
    if (messages.length === 0) onFirstMessage?.(id, text || sent[0].file.name)
    const files = await toFileParts(sent.map((item) => item.file))
    revoke(sent)
    const metadata = sentNow()
    // An empty text part is refused by some providers, so files can go alone.
    sendMessage(
      files.length === 0
        ? { text, metadata }
        : text
          ? { text, files, metadata }
          : { files, metadata },
      { body }
    )
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

  // Spoken turns join the thread as they finish, and take words transcribed
  // later. A typed message's reply writes itself onto the end while it
  // streams, so they wait for it. The first of them starts the thread, as a
  // first typed message does.
  React.useEffect(() => {
    if (busy) return
    const adding = new Set(
      spoken.flatMap((message) =>
        added.current.has(message.id) ? [] : [message.id]
      )
    )
    const grown = spoken.some((message) => {
      const there = messages.find((other) => other.id === message.id)
      return there !== undefined && wordsOf(there) !== wordsOf(message)
    })
    if (adding.size === 0 && !grown) return
    for (const messageId of adding) added.current.add(messageId)
    if (messages.length === 0) {
      const first =
        spoken.find((message) => message.role === "user") ?? spoken[0]
      const part = first.parts[0]
      onFirstMessage?.(id, part?.type === "text" ? part.text : "Voice chat")
    }
    setMessages((current) => withSpoken(current, spoken, adding))
  }, [busy, spoken, messages, id, onFirstMessage, setMessages])

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
        // Highlighting a message's text offers to reply to it, or to save
        // it to memory.
        <SelectionToolbar
          onReply={replyTo}
          saveOptions={[
            {
              label: "Memory",
              icon: Bookmark02Icon,
              onSave: async (text) => {
                await createMemory({ text, savedBy: "you", chatId: id })
              },
            },
          ]}
        >
          <Thread
            messages={messages}
            voiceChat={talking?.id}
            // A reply has begun before its first words, while the status still
            // reads "submitted".
            streaming={busy}
            thinkingSince={thinkingSince}
            error={error}
            onRetry={() => regenerate({ body })}
            // The answer goes back as the plan's tool output, with the model
            // as picked, in case it sends the chat on.
            onPlanReview={(toolCallId, decision) =>
              addToolOutput({
                tool: PLAN_TOOL,
                toolCallId,
                output: decision,
                options: { body },
              })
            }
            // Yes or no goes back on the tool call, and the chat carries on
            // with the model as picked.
            onToolApproval={(id, approved) =>
              addToolApprovalResponse({ id, approved, options: { body } })
            }
            onRegenerate={(messageId) => regenerate({ messageId, body })}
            onRate={(messageId, rating) => annotate(messageId, { rating })}
            keptMemories={kept}
            onForgetMemory={deleteMemory}
            onSaveMemory={async (_, text) => {
              await createMemory({ text, savedBy: "you", chatId: id })
            }}
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
        </SelectionToolbar>
      )}
      <div
        className={
          compact
            ? "w-full shrink-0 px-3 pb-3"
            : "mx-auto w-full max-w-3xl shrink-0 px-4 pb-4"
        }
      >
        {/* Each tool a click away in a new chat, in one row that scrolls
            sideways. Padded so the scroller doesn't clip a focus ring or the
            rise they arrive with. */}
        {messages.length === 0 ? (
          <Suggestions scroll className="-mx-0.5 px-0.5 pt-0.5 pb-3">
            {TOOLS.map((tool) => (
              <Suggestion
                key={tool.id}
                onClick={() => send(tool.suggestion)}
                className="ps-1.5"
              >
                {/* The tool it tries, in the mark the Tools page shows it by. */}
                <ToolMark
                  id={tool.id}
                  className="size-5 rounded-md"
                  iconClassName="size-3.5"
                />
                {tool.suggestion}
              </Suggestion>
            ))}
          </Suggestions>
        ) : null}
        {/* Folds open while a voice chat is going, as the attachment tray
            does, and away once it ends. */}
        <div
          data-open={talking ? "" : undefined}
          inert={!talking}
          className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none data-open:grid-rows-[1fr] data-open:opacity-100"
        >
          <div className="min-h-0 overflow-hidden">
            {voice ? (
              <VoiceChat
                key={voice.id}
                id={voice.id}
                model={voice.model}
                messages={messages}
                busy={busy}
                ending={voice.ending}
                // A session reports all of its turns each time, which take
                // the place of what it reported before.
                onMessages={(turns) =>
                  setSpoken((current) => [
                    ...current.filter(
                      (message) => !turns.some((turn) => turn.id === message.id)
                    ),
                    ...turns,
                  ])
                }
                className="pb-3"
              />
            ) : null}
          </div>
        </div>
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
          value={draft}
          onValueChange={setDraft}
          onSubmit={(text) => send(text)}
          onStop={() => stop()}
        >
          <ComposerInput ref={composerInput} />
          <ComposerFooter>
            <ComposerAddMenu>
              <ComposerAddFiles />
              <ComposerAddFolder />
              <ComposerAddScreenshot />
            </ComposerAddMenu>
            <ComposerEmoji />
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
            {/* Talking is what the voice chat hears, so it isn't dictated too. */}
            {talking ? null : <ComposerDictate />}
            <ComposerSubmit
              voice={talking !== undefined}
              // Only a model whose maker has a realtime model can be talked
              // with, but a chat going can always be ended.
              onVoiceChange={
                talking || option?.voice
                  ? (on) => {
                      if (on && option?.voice) {
                        setVoice({
                          id: crypto.randomUUID(),
                          model: option.voice,
                        })
                        return
                      }
                      setVoice((current) =>
                        current ? { ...current, ending: true } : current
                      )
                    }
                  : undefined
              }
            />
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
