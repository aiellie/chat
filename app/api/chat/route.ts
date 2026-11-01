import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

import { defaultModel } from "@/lib/models"

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: unknown } =
    await req.json()

  const result = streamText({
    // A plain model id goes through the Vercel AI Gateway, which reads
    // AI_GATEWAY_API_KEY from the environment.
    model: typeof model === "string" && model ? model : defaultModel,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
