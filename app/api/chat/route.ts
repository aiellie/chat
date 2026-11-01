import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

import { defaultModel } from "@/lib/models"

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

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: unknown } =
    await req.json()

  const result = streamText({
    // A plain model id goes through the Vercel AI Gateway, which reads
    // AI_GATEWAY_API_KEY from the environment.
    model: typeof model === "string" && model ? model : defaultModel,
    messages: await convertToModelMessages(messages.map(withoutDroppedFiles)),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
