import { gateway } from "ai"

import type { ModelOption } from "@/lib/models"

// The Gateway's public catalogue, which also gives each model's context
// window and prices. The SDK's own list leaves those out.
const CATALOGUE = "https://ai-gateway.vercel.sh/v1/models"

type CatalogueEntry = {
  id: string
  context_window?: number
  pricing?: { input?: string; output?: string; input_cache_read?: string }
}

const price = (value?: string) => (value ? Number(value) : undefined)

async function catalogue() {
  try {
    const response = await fetch(CATALOGUE, { next: { revalidate: 3600 } })
    if (!response.ok) return new Map<string, CatalogueEntry>()
    const { data }: { data: CatalogueEntry[] } = await response.json()
    return new Map(data.map((entry) => [entry.id, entry]))
  } catch {
    // Without it the list still works; the context meter just has no limit.
    return new Map<string, CatalogueEntry>()
  }
}

// The list comes from the AI Gateway itself, so it only ever offers models
// the key can actually call.
export async function GET() {
  try {
    const [{ models }, details] = await Promise.all([
      gateway.getAvailableModels(),
      catalogue(),
    ])
    const options: ModelOption[] = models
      .filter((model) => (model.modelType ?? "language") === "language")
      .map((model) => {
        const entry = details.get(model.id)
        const input = price(entry?.pricing?.input ?? model.pricing?.input)
        const output = price(entry?.pricing?.output ?? model.pricing?.output)
        return {
          id: model.id,
          name: model.name,
          contextWindow: entry?.context_window,
          pricing:
            input !== undefined && output !== undefined
              ? {
                  input,
                  output,
                  cacheRead: price(
                    entry?.pricing?.input_cache_read ??
                      model.pricing?.cachedInputTokens
                  ),
                }
              : undefined,
        }
      })

    return Response.json(options, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    })
  } catch {
    return Response.json([], { status: 502 })
  }
}
