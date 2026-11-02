import type { ModelIconName } from "@/components/aiellie/icons"

/** Reasoning effort, as the AI SDK's `reasoning` setting takes it. */
const EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const

type Effort = (typeof EFFORTS)[number]

interface ModelOption {
  /** Its Vercel AI Gateway id, `vendor/model`, such as "anthropic/claude-opus-5.5". */
  id: string
  /** What the row says, and what the trigger says once this is chosen. */
  name: string
  /** Whose mark it shows. Left out, it's read from the first half of `id`. */
  vendor?: ModelIconName
  /** Its id at the vendor's own API, where that isn't the part of `id` after the slash. */
  vendorId?: string
  /** Listed, but not choosable — a model the current plan does not include. */
  disabled?: boolean
  /** How many tokens a request to it can hold, prompt and reply together. */
  contextWindow?: number
  /** US dollars per token. */
  pricing?: { input: number; output: number; cacheRead?: number }
  /** The reasoning efforts it takes, lowest first. None for a model that doesn't reason. */
  efforts?: Effort[]
  /**
   * Context sizes to pick from, smallest first, ending with its full window.
   * Each below it is where a pricier long-context rate starts. Only for
   * models with more than one.
   */
  contexts?: number[]
  /** Its fast variant's id, for the Fast switch. */
  fastId?: string
  /**
   * The realtime model a voice chat talks to while it's picked. None for a
   * model whose maker has none, which can't be talked with.
   */
  voice?: { id: string; name: string }
}

type ModelProvider = "gateway" | "openai" | "anthropic" | "google"

interface ModelProviderOption {
  id: ModelProvider
  name: string
  /** The vendor whose models a key for it reaches. The gateway reaches them all. */
  vendor?: ModelIconName
  /** Which models its key reaches, in a few words. */
  description: string
  /** Where a key for it is made. */
  keysUrl: string
  /** How its keys begin, shown in an empty field. */
  placeholder: string
}

const VENDOR_NAMES: Record<ModelIconName, string> = {
  claude: "Anthropic",
  openai: "OpenAI",
  gemini: "Google",
  grok: "xAI",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  v0: "Vercel",
}

// Keyed by the provider half of a gateway id.
const GATEWAY_VENDORS: Record<string, ModelIconName> = {
  anthropic: "claude",
  openai: "openai",
  google: "gemini",
  spacexai: "grok",
  xai: "grok",
  deepseek: "deepseek",
  mistral: "mistral",
  vercel: "v0",
}

function vendorOf(model: ModelOption): ModelIconName | undefined {
  return model.vendor ?? GATEWAY_VENDORS[model.id.split("/")[0]]
}

// A group sits where its first model was, so the list needs no sorting.
function groupByVendor(models: ModelOption[]) {
  const groups = new Map<ModelIconName, ModelOption[]>()

  for (const model of models) {
    const vendor = vendorOf(model)
    if (!vendor) continue
    const group = groups.get(vendor)
    if (group) group.push(model)
    else groups.set(vendor, [model])
  }

  return [...groups]
}

// Replace them with the ones you serve. Any id on the Vercel AI Gateway works.
const MODELS: ModelOption[] = [
  {
    id: "anthropic/claude-opus-5.5",
    name: "Claude Opus 5.5",
    vendor: "claude",
    vendorId: "claude-opus-5-5",
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    vendor: "claude",
  },
  { id: "openai/gpt-6-sol", name: "GPT-6 Sol", vendor: "openai" },
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    vendor: "gemini",
  },
  { id: "spacexai/grok-4.7", name: "Grok 4.7", vendor: "grok" },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    vendor: "claude",
    vendorId: "claude-haiku-4-5",
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    vendor: "deepseek",
  },
  {
    id: "mistral/mistral-large-3",
    name: "Mistral Large 3",
    vendor: "mistral",
    disabled: true,
  },
]

const PROVIDERS: ModelProviderOption[] = [
  {
    id: "gateway",
    name: "Vercel AI Gateway",
    description: "One key for every model in the list.",
    keysUrl:
      "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys&title=AI+Gateway+API+Keys",
    placeholder: "vck_…",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models.",
    vendor: "openai",
    keysUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models.",
    vendor: "claude",
    keysUrl: "https://platform.claude.com/settings/keys",
    placeholder: "sk-ant-…",
  },
  {
    id: "google",
    name: "Google",
    description: "Gemini models.",
    vendor: "gemini",
    keysUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza…",
  },
]

type ProviderKeys = Partial<Record<ModelProvider, string>>

// The vendor's own key when there is one, since it skips a hop; otherwise the
// gateway, which reaches every model.
function routeOf(model: ModelOption, keys: ProviderKeys) {
  const own = PROVIDERS.find((provider) => provider.vendor === vendorOf(model))
  if (own && keys[own.id]) {
    return {
      provider: own.id,
      model: model.vendorId ?? model.id.slice(model.id.indexOf("/") + 1),
      key: keys[own.id]!,
    }
  }
  if (keys.gateway) {
    return { provider: "gateway" as const, model: model.id, key: keys.gateway }
  }
  return null
}

// Used until the person picks another, and whenever a request names none.
const defaultModel = "anthropic/claude-opus-5.5"

/**
 * A gateway realtime model, which hears and speaks itself rather than going
 * through text, and the voice it speaks in where its maker's default isn't
 * the one wanted.
 */
type VoiceModel = {
  id: string
  voice?: string
  /**
   * Takes its instructions only as it starts, and closes the chat if sent
   * more, so it isn't told what's typed while it talks.
   */
  setOnce?: boolean
}

// Each maker's realtime model, by the provider half of a gateway id. xAI's,
// spacexai/grok-voice-3.0, is left out while the team's Gateway allowlist
// refuses it, though the Gateway still lists it.
const VOICE_MODELS: Record<string, VoiceModel> = {
  openai: { id: "openai/gpt-realtime-2.1", voice: "marin" },
  google: { id: "google/gemini-3.8-live", setOnce: true },
}

/** The realtime model a voice chat with this model talks to, if there's one. */
const voiceModelOf = (modelId: string): VoiceModel | undefined =>
  VOICE_MODELS[modelId.split("/")[0]]

/** Whether this is one of the realtime models above. */
const isVoiceModel = (modelId: unknown) =>
  Object.values(VOICE_MODELS).some((model) => model.id === modelId)

/** Medium where a model has it, otherwise its lowest effort that reasons. */
function defaultEffort(efforts: Effort[]) {
  return efforts.includes("medium")
    ? "medium"
    : (efforts.find((effort) => effort !== "none") ?? efforts[0])
}

const isEffort = (value: unknown): value is Effort =>
  EFFORTS.includes(value as Effort)

export {
  defaultEffort,
  defaultModel,
  EFFORTS,
  groupByVendor,
  isEffort,
  isVoiceModel,
  MODELS,
  PROVIDERS,
  routeOf,
  VENDOR_NAMES,
  vendorOf,
  voiceModelOf,
}
export type {
  Effort,
  ModelOption,
  ModelProvider,
  ModelProviderOption,
  ProviderKeys,
  VoiceModel,
}
