// API keys the person sets in the app, kept in this browser's localStorage.
// Each request to the app's routes carries them in headers. The Gateway key
// takes the place of the server's AI_GATEWAY_API_KEY; a provider key has
// that provider's models called directly instead of through the Gateway (see
// lib/providers.ts). Headers, not the body, so the AI debug panel, which
// records request bodies, never holds them.

const STORAGE_KEY = "aiellie:api-keys"
const GATEWAY_HEADER = "x-aiellie-gateway-key"
const PROVIDERS_HEADER = "x-aiellie-provider-keys"
const CHANGE_EVENT = "aiellie:api-keys"

/**
 * Providers a key can be set for, by the slug their model ids start with,
 * how their keys begin (Mistral's have no set start), and where to make one.
 */
const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    keyPrefix: "sk-ant-",
    keyUrl: "https://platform.claude.com/settings/keys",
  },
  {
    id: "openai",
    name: "OpenAI",
    keyPrefix: "sk-",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    name: "Google",
    keyPrefix: "AIza",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "mistral",
    name: "Mistral",
    keyPrefix: "",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    keyPrefix: "sk-",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
] as const

/** How a Vercel AI Gateway key begins, and where to make one. */
const GATEWAY_KEY_PREFIX = "vck_"
const GATEWAY_KEY_URL =
  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys&title=AI+Gateway+API+Keys"

type ProviderId = (typeof PROVIDERS)[number]["id"]

type ApiKeys = {
  gateway?: string
  providers?: Partial<Record<ProviderId, string>>
}

function loadApiKeys(): ApiKeys {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as ApiKeys) : {}
  } catch {
    return {}
  }
}

/** Saves the keys, leaving out empty ones, and tells the app they changed. */
function saveApiKeys(keys: ApiKeys) {
  const gateway = keys.gateway?.trim() || undefined
  const providers = Object.fromEntries(
    Object.entries(keys.providers ?? {})
      .map(([id, key]) => [id, key?.trim()])
      .filter(([, key]) => key)
  )
  const kept: ApiKeys = {
    ...(gateway ? { gateway } : {}),
    ...(Object.keys(providers).length > 0 ? { providers } : {}),
  }
  try {
    if (Object.keys(kept).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
  } catch {
    // Blocked storage keeps them for nothing; the server's key still works.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function onApiKeysChange(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

/** The headers that carry the keys, for a request to the app's routes. */
function apiKeyHeaders(): Record<string, string> {
  const { gateway, providers } = loadApiKeys()
  return {
    ...(gateway ? { [GATEWAY_HEADER]: gateway } : {}),
    ...(providers && Object.keys(providers).length > 0
      ? { [PROVIDERS_HEADER]: JSON.stringify(providers) }
      : {}),
  }
}

/**
 * On the server: the keys a request carried. Only the providers listed above
 * are kept.
 */
function apiKeysFrom(request: Request) {
  const gateway = request.headers.get(GATEWAY_HEADER) || undefined
  const providers: Partial<Record<ProviderId, string>> = {}
  try {
    const sent = JSON.parse(
      request.headers.get(PROVIDERS_HEADER) ?? "{}"
    ) as Record<string, unknown>
    for (const { id } of PROVIDERS) {
      const key = sent[id]
      if (typeof key === "string" && key) providers[id] = key
    }
  } catch {
    // A header that isn't JSON is ignored, as if it weren't sent.
  }
  return { gateway, providers }
}

export {
  apiKeyHeaders,
  apiKeysFrom,
  GATEWAY_KEY_PREFIX,
  GATEWAY_KEY_URL,
  loadApiKeys,
  onApiKeysChange,
  PROVIDERS,
  saveApiKeys,
}
export type { ApiKeys, ProviderId }
