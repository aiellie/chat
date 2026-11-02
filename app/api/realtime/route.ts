import { createGateway, gateway } from "ai"

import { apiKeysFrom } from "@/lib/api-keys"
import { isVoiceModel } from "@/lib/models"

// Starts a voice chat with one of the app's realtime models: a short-lived
// secret the browser opens its realtime connection to the AI Gateway with,
// so it never holds the Gateway key. The key is the API keys dialog's, or
// else the server's AI_GATEWAY_API_KEY.
export async function POST(req: Request) {
  const { model }: { model?: unknown } = await req.json().catch(() => ({}))
  if (!isVoiceModel(model) || typeof model !== "string")
    return Response.json(
      { error: "That model can't be talked with." },
      { status: 400 }
    )
  const { gateway: apiKey } = apiKeysFrom(req)
  const provider = apiKey ? createGateway({ apiKey }) : gateway
  try {
    const setup = await provider.experimental_realtime.getToken({
      model,
      // Only needed to open the connection, which stays open after.
      expiresAfterSeconds: 60,
    })
    return Response.json(setup)
  } catch (error) {
    const status =
      error instanceof Object &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 502
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Voice chat couldn't start.",
      },
      { status }
    )
  }
}
