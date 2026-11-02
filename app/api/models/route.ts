import { createGateway, gateway } from "ai"

import { apiKeysFrom } from "@/lib/api-keys"
import {
  EFFORTS,
  isEffort,
  voiceModelOf,
  type Effort,
  type ModelOption,
} from "@/lib/models"
import { routeOf } from "@/lib/providers"

// The Gateway's public catalogue, which also gives each model's context
// window, prices and reasoning options. The SDK's own list leaves those out.
const CATALOGUE = "https://ai-gateway.vercel.sh/v1/models"

type CatalogueEntry = {
  id: string
  name?: string
  type?: string
  context_window?: number
  pricing?: {
    input?: string
    output?: string
    input_cache_read?: string
    /** Where a pricier rate starts, as the prompt grows. */
    input_tiers?: Array<{ min?: number; max?: number | null }>
  }
  reasoning_options?: Array<{ type: string; values?: string[] }>
}

const price = (value?: string) => (value ? Number(value) : undefined)

// Variants of another model rather than models of their own: fast is the
// Fast switch, and batch can't stream a chat reply.
const VARIANT = /-(fast|batch)$/

// Makers whose models aren't offered, for now, by the provider half of a
// gateway id.
const HIDDEN = new Set([
  "alibaba",
  "amazon",
  "bytedance",
  "callstack",
  "cohere",
  "elorian",
  "fireworks",
  "inception",
  "inclusionai",
  "inference-net",
  "interfaze",
  "liquid",
  "meituan",
  "meta",
  "minimax",
  "mixedbread",
  "moonshotai",
  "morph",
  "nvidia",
  "particle",
  "perplexity",
  "poolside",
  "quiverai",
  "reflection",
  "sakana",
  "scaledown",
  "stealth",
  "stepfun",
  "tencent",
  "thinkingmachines",
  "xiaomi",
  "zai",
])

/** The efforts a model takes, lowest first, or none if it doesn't reason. */
function effortsOf(entry?: CatalogueEntry): Effort[] | undefined {
  const options = entry?.reasoning_options ?? []
  const listed = options.flatMap((option) =>
    option.type === "effort" ? (option.values ?? []).filter(isEffort) : []
  )
  // One that can be switched off can go without; one set by a token budget
  // takes the usual levels, which the SDK turns into budgets.
  if (options.some((option) => option.type === "toggle")) listed.push("none")
  if (options.some((option) => option.type === "budget_tokens"))
    listed.push("low", "medium", "high")
  const efforts = EFFORTS.filter((effort) => listed.includes(effort))
  return efforts.length > 0 ? efforts : undefined
}

/** Sizes to pick from: each long-context price step, then the full window. */
function contextsOf(entry?: CatalogueEntry): number[] | undefined {
  const full = entry?.context_window
  if (!full) return undefined
  const steps = (entry.pricing?.input_tiers ?? []).flatMap((tier) =>
    // Tiers end a token past a round number, as in 200001.
    tier.max ? [Math.floor(tier.max / 1000) * 1000] : []
  )
  const sizes = [...new Set([...steps.filter((size) => size < full), full])]
  return sizes.length > 1 ? sizes.sort((a, b) => a - b) : undefined
}

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
// the key can actually call: the one set in the app's API keys dialog, or
// the server's. Without a working Gateway key, it offers the catalogue's
// models whose provider there's a key for, as those are called directly.
export async function GET(req: Request) {
  const keys = apiKeysFrom(req)
  const [available, details] = await Promise.all([
    (keys.gateway ? createGateway({ apiKey: keys.gateway }) : gateway)
      .getAvailableModels()
      .then(({ models }) => models)
      .catch(() => undefined),
    catalogue(),
  ])
  const listed = available?.filter(
    (model) => (model.modelType ?? "language") === "language"
  )
  // Voice chats go through the Gateway, so only with a key it takes.
  const realtime = new Map(
    (available ?? []).flatMap((model) =>
      model.modelType === "realtime" ? [[model.id, model.name]] : []
    )
  )

  const models = (
    listed ??
    [...details.values()].filter(
      (entry) =>
        entry.type === "language" &&
        routeOf(entry.id, keys.providers).via === "provider"
    )
  ).filter(
    (model) =>
      !VARIANT.test(model.id) && !HIDDEN.has(model.id.split("/")[0] ?? "")
  )
  if (models.length === 0) return Response.json([], { status: 502 })
  const ids = new Set([
    ...(listed ?? []).map((model) => model.id),
    ...details.keys(),
  ])

  const options: ModelOption[] = models.map((model) => {
    const entry = details.get(model.id)
    const gatewayPricing = "specification" in model ? model.pricing : undefined
    const input = price(entry?.pricing?.input ?? gatewayPricing?.input)
    const output = price(entry?.pricing?.output ?? gatewayPricing?.output)
    const fastId = `${model.id}-fast`
    const voice = voiceModelOf(model.id)
    const voiceName = voice && realtime.get(voice.id)
    return {
      id: model.id,
      name: model.name ?? entry?.name ?? model.id,
      contextWindow: entry?.context_window,
      efforts: effortsOf(entry),
      contexts: contextsOf(entry),
      fastId: ids.has(fastId) ? fastId : undefined,
      voice: voiceName ? { id: voice.id, name: voiceName } : undefined,
      pricing:
        input !== undefined && output !== undefined
          ? {
              input,
              output,
              cacheRead: price(
                entry?.pricing?.input_cache_read ??
                  gatewayPricing?.cachedInputTokens
              ),
            }
          : undefined,
    }
  })

  return Response.json(options, {
    // A list for someone's own keys is theirs alone, so it isn't shared.
    headers: {
      "Cache-Control":
        keys.gateway || Object.keys(keys.providers).length > 0
          ? "private, no-store"
          : "public, s-maxage=3600",
    },
  })
}
