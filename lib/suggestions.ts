/**
 * One suggestion for each tool the model can use, shown in a row above the
 * composer while a chat is empty, so every tool is a click from a new chat.
 * A new tool gets its line here.
 */
type ToolSuggestion = {
  /** Sent as written when picked, and shown as its label. */
  prompt: string
  /** Turns search on for it, as the toggle would. */
  search?: boolean
}

const TOOL_SUGGESTIONS: ToolSuggestion[] = [
  // The provider's web search, or the Gateway's (lib/providers.ts).
  { prompt: "Search the web for this week's AI news", search: true },
  // The plan to review and approve (lib/plan.ts).
  { prompt: "Make a plan to launch a portfolio site" },
]

export { TOOL_SUGGESTIONS }
export type { ToolSuggestion }
