import { createAnthropic } from "@ai-sdk/anthropic"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogle } from "@ai-sdk/google"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createGateway, type LanguageModel } from "ai"

import type { ProviderId } from "@/lib/api-keys"

// Server only: picks how a request reaches its model. Model ids are the
// Gateway's, "<provider>/<model>". With a key for that provider, from the API
// keys dialog or the server's own environment, the provider is called
// directly; without one, the request goes through the AI Gateway.

type Direct = {
  /** The variable the server's key for this provider is read from. */
  env: string
  create: (apiKey: string) => (model: string) => LanguageModel
  /** The provider's own name for a model, from the Gateway's. */
  name?: (model: string) => string
}

const DIRECT: Record<ProviderId, Direct> = {
  anthropic: {
    env: "ANTHROPIC_API_KEY",
    create: (apiKey) => createAnthropic({ apiKey }),
    // The Gateway writes versions with dots, Anthropic with hyphens:
    // "claude-opus-5.5" is "claude-opus-5-5".
    name: (model) => model.replace(/\./g, "-"),
  },
  openai: {
    env: "OPENAI_API_KEY",
    create: (apiKey) => createOpenAI({ apiKey }),
  },
  google: {
    env: "GOOGLE_GENERATIVE_AI_API_KEY",
    create: (apiKey) => createGoogle({ apiKey }),
  },
  mistral: {
    env: "MISTRAL_API_KEY",
    create: (apiKey) => createMistral({ apiKey }),
  },
  deepseek: {
    env: "DEEPSEEK_API_KEY",
    create: (apiKey) => createDeepSeek({ apiKey }),
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
  const model = modelId.slice(slash + 1)
  return {
    via: "provider",
    provider,
    model: direct.name ? direct.name(model) : model,
    key,
  }
}

/**
 * The model to call, and how it's reached. `gatewayKey` takes the place of
 * the server's AI_GATEWAY_API_KEY when a request goes through the Gateway.
 */
function resolveModel(
  modelId: string,
  keys: {
    gateway?: string
    providers?: Partial<Record<ProviderId, string>>
  }
): { model: LanguageModel; route: Route } {
  const { key, ...route } = routeOf(modelId, keys.providers)
  if (route.via === "provider" && key)
    return { model: DIRECT[route.provider].create(key)(route.model), route }
  return {
    model: keys.gateway
      ? createGateway({ apiKey: keys.gateway })(modelId)
      : modelId,
    route,
  }
}

export { resolveModel, routeOf }
export type { Route }
