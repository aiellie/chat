import {
  convertToModelMessages,
  type FinishReason,
  type LanguageModelUsage,
  type ModelMessage,
  type UIMessage,
} from "ai"

// A thread reopened from storage keeps its files' names but not their
// contents, so the model is told one was there instead.
function withoutDroppedFiles(message: UIMessage): UIMessage {
  return {
    ...message,
    parts: message.parts.map((part) =>
      part.type === "file" && !part.url
        ? {
            type: "text" as const,
            text: `[${part.filename ?? "A file"} was attached here but is no longer available.]`,
          }
        : part
    ),
  }
}

/** The chat as the model is given it. The chat route sends exactly this. */
function toModelMessages(messages: UIMessage[]) {
  return convertToModelMessages(messages.map(withoutDroppedFiles))
}

// A rough count, enough to keep a request under a size: about four
// characters a token, and a flat allowance for a file or picture.
const FILE_TOKENS = 1500

function tokensOf(message: ModelMessage) {
  if (typeof message.content === "string") return message.content.length / 4
  return message.content.reduce(
    (sum, part) =>
      sum +
      ("text" in part && typeof part.text === "string"
        ? part.text.length / 4
        : FILE_TOKENS),
    4
  )
}

/**
 * The newest messages that fit in `limit` tokens, leaving a tenth of it for
 * the reply. The newest is always kept, and the result starts with one of
 * the person's, as some providers require.
 */
function fitToContext(messages: ModelMessage[], limit: number) {
  const budget = limit * 0.9
  let used = 0
  let start = messages.length
  while (start > 0) {
    const size = tokensOf(messages[start - 1])
    if (start < messages.length && used + size > budget) break
    used += size
    start--
  }
  while (start < messages.length - 1 && messages[start].role !== "user") start++
  return messages.slice(start)
}

/** What a reply's last stream event carries about how it went. */
type ReplyMetadata = {
  model: string
  /** Whether the provider was called directly or through the AI Gateway. */
  via?: "provider" | "gateway"
  finishReason: FinishReason
  usage: LanguageModelUsage
  /** How long the model spent thinking, if it did, in whole seconds. */
  reasoningSeconds?: number
}

/**
 * What every message carries. `createdAt` is stamped as a message is sent and
 * as a reply starts; a reply gains the rest as it finishes. Messages from
 * before timestamps were kept have none.
 */
type MessageMetadata = {
  createdAt?: number
  /** How the person rated a reply. */
  rating?: "up" | "down"
  /** Why the person reported a reply, kept with it. */
  report?: { reason: string; details: string; at: number }
  /**
   * Said aloud in a voice chat, so its text is what was transcribed: which
   * chat that was, and the name of the realtime model it was with.
   */
  spoken?: { chat: string; model: string }
} & Partial<ReplyMetadata>

export { fitToContext, toModelMessages }
export type { MessageMetadata, ReplyMetadata }
