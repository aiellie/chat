/** A gateway model id such as "anthropic/claude-opus-5.5", and its display name. */
type ModelOption = { id: string; name: string }

// Used until the person picks another, and whenever a request names none.
const defaultModel = "anthropic/claude-opus-5.5"

export { defaultModel }
export type { ModelOption }
