import { gateway } from "ai"

import type { ModelOption } from "@/lib/models"

// The list comes from the AI Gateway itself, so it only ever offers models
// the key can actually call.
export async function GET() {
  try {
    const { models } = await gateway.getAvailableModels()
    const options: ModelOption[] = models
      .filter((model) => (model.modelType ?? "language") === "language")
      .map((model) => ({ id: model.id, name: model.name }))

    return Response.json(options, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    })
  } catch {
    return Response.json([], { status: 502 })
  }
}
