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

/** A gateway model id such as "anthropic/claude-opus-5.5", and its display name. */
type ModelOption = {
  id: string
  name: string
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
  isEffort,
  isVoiceModel,
  voiceModelOf,
}
export type { Effort, ModelOption, VoiceModel }
