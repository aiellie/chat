import { createAnthropic } from "@ai-sdk/anthropic"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogle } from "@ai-sdk/google"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createGateway, gateway, type LanguageModel, type ToolSet } from "ai"

import type { ProviderId } from "@/lib/api-keys"

// Server only: picks how a request reaches its model. Model ids are the
// Gateway's, "<provider>/<model>". With a key for that provider, from the API
// keys dialog or the server's own environment, the provider is called
// directly; without one, the request goes through the AI Gateway.

// The provider packages build their tools against a newer copy of the shared
// tool types than `ai` does, which TypeScript won't match up though they're
// the same at runtime.
const toolSet = (tools: Record<string, unknown>) => tools as ToolSet

type Direct = {
  /** The variable the server's key for this provider is read from. */
  env: string
  model: (apiKey: string, model: string) => LanguageModel
  /**
   * The provider's own web search, which it runs itself. Keyed as the
   * provider expects; "web_search" where it lets the name be chosen.
   */
  search?: (apiKey: string) => ToolSet
  /** The provider's own name for a model, from the Gateway's. */
  name?: (model: string) => string
}

const DIRECT: Record<ProviderId, Direct> = {
  anthropic: {
    env: "ANTHROPIC_API_KEY",
    model: (apiKey, model) => createAnthropic({ apiKey })(model),
    search: (apiKey) =>
      toolSet({
        web_search: createAnthropic({ apiKey }).tools.webSearch_20260318({
          maxUses: 5,
        }),
      }),
    // The Gateway writes versions with dots, Anthropic with hyphens:
    // "claude-opus-5.5" is "claude-opus-5-5".
    name: (model) => model.replace(/\./g, "-"),
  },
  openai: {
    env: "OPENAI_API_KEY",
    model: (apiKey, model) => createOpenAI({ apiKey })(model),
    search: (apiKey) =>
      toolSet({ web_search: createOpenAI({ apiKey }).tools.webSearch({}) }),
  },
  google: {
    env: "GOOGLE_GENERATIVE_AI_API_KEY",
    model: (apiKey, model) => createGoogle({ apiKey })(model),
    search: (apiKey) =>
      toolSet({
        google_search: createGoogle({ apiKey }).tools.googleSearch({}),
      }),
  },
  mistral: {
    env: "MISTRAL_API_KEY",
    model: (apiKey, model) => createMistral({ apiKey })(model),
  },
  deepseek: {
    env: "DEEPSEEK_API_KEY",
    model: (apiKey, model) => createDeepSeek({ apiKey })(model),
  },
}

type Route =
  | { via: "provider"; provider: ProviderId; model: string }
  | { via: "gateway"; model: string }

/** Where a model's request goes, given the keys it came with. */
function routeOf(
  modelId: string,
  providerKeys: Partial<Record<ProviderId, string>> = {}
): Route & { key?: string } {
  const slash = modelId.indexOf("/")
  const provider = modelId.slice(0, slash) as ProviderId
  const direct = slash > 0 ? DIRECT[provider] : undefined
  const key = direct && (providerKeys[provider] || process.env[direct.env])
  if (!direct || !key) return { via: "gateway", model: modelId }
  // A Gateway "-fast" variant has no id of its own at the provider, so a
  // direct call goes to the model itself.
  const model = modelId.slice(slash + 1).replace(/-fast$/, "")
  return {
    via: "provider",
    provider,
    model: direct.name ? direct.name(model) : model,
    key,
  }
}

/**
 * The model to call, how it's reached, and the web search it can use that
 * way. `gatewayKey` takes the place of the server's AI_GATEWAY_API_KEY when a
 * request goes through the Gateway.
 */
function resolveModel(
  modelId: string,
  keys: {
    gateway?: string
    providers?: Partial<Record<ProviderId, string>>
  }
): { model: LanguageModel; route: Route; search?: ToolSet } {
  const { key, ...route } = routeOf(modelId, keys.providers)
  if (route.via === "provider" && key) {
    const direct = DIRECT[route.provider]
    return {
      model: direct.model(key, route.model),
      route,
      search: direct.search?.(key),
    }
  }
  const provider = keys.gateway
    ? createGateway({ apiKey: keys.gateway })
    : gateway
  return {
    model: provider(modelId),
    route,
    // The Gateway runs this search itself, for any model it serves.
    search: { web_search: provider.tools.perplexitySearch({ maxResults: 8 }) },
  }
}

export { resolveModel, routeOf }
export type { Route }
