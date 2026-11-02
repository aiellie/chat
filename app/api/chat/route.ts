import {
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type TextStreamPart,
  type ToolSet,
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

// With search on, the model cites what it found where it uses it, in the form
// a reply draws as a numbered citation that previews the page.
const CITE_SOURCES =
  "When you use something a web search found, cite the page right after the sentence that uses it, as a markdown link with a number for its text and the page's address, like [1](https://example.com/page). Cite only pages your searches returned, and don't list them again at the end: the chat shows them under your reply."

/**
 * Times the reasoning as it streams past, block by block, so a reply keeps
 * how long the model thought for. `seconds()` is the total so far.
 */
function reasoningClock() {
  const started = new Map<string, number>()
  let total = 0
  const watch = new TransformStream<
    TextStreamPart<ToolSet>,
    TextStreamPart<ToolSet>
  >({
    transform(part, controller) {
      if (part.type === "reasoning-start") started.set(part.id, Date.now())
      if (part.type === "reasoning-end") {
        const at = started.get(part.id)
        if (at !== undefined) total += Date.now() - at
        started.delete(part.id)
      }
      controller.enqueue(part)
    },
  })
  return {
    watch,
    seconds: () =>
      total > 0 ? Math.max(1, Math.round(total / 1000)) : undefined,
  }
}

export async function POST(req: Request) {
  const {
    messages,
    model,
    effort,
    context,
    search,
  }: {
    messages: UIMessage[]
    /** The model picked, or its fast variant with Fast on. */
    model?: unknown
    /** The reasoning effort picked, for a model that reasons. */
    effort?: unknown
    /** The context size picked, in tokens, for a model with a choice. */
    context?: unknown
    /** Whether the model may search the web for this reply. */
    search?: unknown
  } = await req.json()
  const modelId = typeof model === "string" && model ? model : defaultModel
  // Straight to the provider when there's a key for it, from the API keys
  // dialog or the server's environment; otherwise through the AI Gateway.
  const resolved = resolveModel(modelId, apiKeysFrom(req))
  const tools = search === true ? resolved.search : undefined

  const modelMessages = await toModelMessages(messages)

  const result = streamText({
    model: resolved.model,
    instructions: tools ? CITE_SOURCES : undefined,
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
    // With search on, the model can look things up, then answer from what it
    // found: a few steps in all.
    tools,
    stopWhen: tools ? isStepCount(5) : undefined,
  })

  const clock = reasoningClock()

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream.pipeThrough(clock.watch),
      // Pages a search turned up, for the reply to list.
      sendSources: true,
      // When the reply started, for its timestamp, and how it went, for the
      // AI debug panel, context meter and reasoning line. Small, so it's kept
      // with the message.
      messageMetadata: ({ part }): MessageMetadata | undefined =>
        part.type === "start"
          ? { createdAt: Date.now() }
          : part.type === "finish"
            ? {
                model: modelId,
                via: resolved.route.via,
                finishReason: part.finishReason,
                usage: part.totalUsage,
                reasoningSeconds: clock.seconds(),
              }
            : undefined,
    }),
  })
}
