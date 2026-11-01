import {
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

import { apiKeysFrom } from "@/lib/api-keys"
import { defaultModel, isEffort } from "@/lib/models"
import {
  fitToContext,
  toModelMessages,
  type MessageMetadata,
} from "@/lib/model-messages"
import { resolveModel } from "@/lib/providers"

export async function POST(req: Request) {
  const {
    messages,
    model,
    effort,
    context,
  }: {
    messages: UIMessage[]
    /** The model picked, or its fast variant with Fast on. */
    model?: unknown
    /** The reasoning effort picked, for a model that reasons. */
    effort?: unknown
    /** The context size picked, in tokens, for a model with a choice. */
    context?: unknown
  } = await req.json()
  const modelId = typeof model === "string" && model ? model : defaultModel
  // Straight to the provider when there's a key for it, from the API keys
  // dialog or the server's environment; otherwise through the AI Gateway.
  const { model: languageModel, route } = resolveModel(
    modelId,
    apiKeysFrom(req)
  )

  const modelMessages = await toModelMessages(messages)

  const result = streamText({
    model: languageModel,
    // A smaller context size picked keeps the request under it, so it stays
    // at the model's standard rate: the oldest messages are left out.
    messages:
      typeof context === "number" && context > 0
        ? fitToContext(modelMessages, context)
        : modelMessages,
    // Each provider maps this to its own setting, whichever way the request
    // goes. Its reasoning streams to the client, where the AI debug panel
    // shows it. Google sends its thoughts back only when asked to.
    reasoning: isEffort(effort) ? effort : "provider-default",
    providerOptions: {
      google: { thinkingConfig: { includeThoughts: true } },
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // When the reply started, for its timestamp, and how it went, for the
      // AI debug panel and context meter. Small, so it's kept with the message.
      messageMetadata: ({ part }): MessageMetadata | undefined =>
        part.type === "start"
          ? { createdAt: Date.now() }
          : part.type === "finish"
            ? {
                model: modelId,
                via: route.via,
                finishReason: part.finishReason,
                usage: part.totalUsage,
              }
            : undefined,
    }),
  })
}
