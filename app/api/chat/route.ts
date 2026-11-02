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
import { failureReason } from "@/lib/failures"
import { defaultModel, isEffort } from "@/lib/models"
import {
  fitToContext,
  toModelMessages,
  type MessageMetadata,
} from "@/lib/model-messages"
import { resolveModel } from "@/lib/providers"
import { chatTools } from "@/lib/tools"

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
  const keys = apiKeysFrom(req)
  const resolved = resolveModel(modelId, keys)
  // Every tool the model may use for this reply, from lib/tools, and how to
  // use them. It uses one only when the reply needs it.
  const { tools, instructions } = chatTools(modelId, keys)

  const modelMessages = await toModelMessages(messages)

  const result = streamText({
    model: resolved.model,
    instructions,
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
    // The model can look things up, then answer from what it found: a few
    // steps in all. A plan ends the reply where it's proposed, as it waits on
    // the person, and an approval sends the chat back here to carry it out.
    tools,
    stopWhen: isStepCount(5),
  })

  const clock = reasoningClock()

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream.pipeThrough(clock.watch),
      // Pages a search turned up, for the reply to list.
      sendSources: true,
      // Why it failed, for the thread to say beside "Failed".
      onError: (error) => failureReason(error, resolved.route),
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
