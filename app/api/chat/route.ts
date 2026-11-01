import {
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

import { defaultModel } from "@/lib/models"
import { toModelMessages, type MessageMetadata } from "@/lib/model-messages"

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: unknown } =
    await req.json()
  const modelId = typeof model === "string" && model ? model : defaultModel

  const result = streamText({
    // A plain model id goes through the Vercel AI Gateway, which reads
    // AI_GATEWAY_API_KEY from the environment.
    model: modelId,
    messages: await toModelMessages(messages),
    // Each provider maps this to its own setting. Its reasoning streams to
    // the client, where the AI debug panel shows it. Google sends its
    // thoughts back only when asked to.
    reasoning: "medium",
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
                finishReason: part.finishReason,
                usage: part.totalUsage,
              }
            : undefined,
    }),
  })
}
