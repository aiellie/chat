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
}

// Used until the person picks another, and whenever a request names none.
const defaultModel = "anthropic/claude-opus-5.5"

/** Medium where a model has it, otherwise its lowest effort that reasons. */
function defaultEffort(efforts: Effort[]) {
  return efforts.includes("medium")
    ? "medium"
    : (efforts.find((effort) => effort !== "none") ?? efforts[0])
}

const isEffort = (value: unknown): value is Effort =>
  EFFORTS.includes(value as Effort)

export { defaultEffort, defaultModel, EFFORTS, isEffort }
export type { Effort, ModelOption }
