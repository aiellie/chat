import {
  convertToModelMessages,
  type FinishReason,
  type LanguageModelUsage,
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

/**
 * The chat as the model is given it. The chat route sends exactly this, and
 * the AI debug panel shows it.
 */
function toModelMessages(messages: UIMessage[]) {
  return convertToModelMessages(messages.map(withoutDroppedFiles))
}

/** What a reply's last stream event carries about how it went. */
type ReplyMetadata = {
  model: string
  finishReason: FinishReason
  usage: LanguageModelUsage
}

export { toModelMessages }
export type { ReplyMetadata }
