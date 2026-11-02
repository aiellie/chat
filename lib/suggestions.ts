/**
 * One suggestion for each tool the model can use, shown in a row above the
 * composer while a chat is empty, so every tool is a click from a new chat.
 * A new tool in lib/tools gets its line here. Kept apart from lib/tools,
 * which is server code, since the composer reads it in the browser.
 */
type ToolSuggestion = {
  /** Sent as written when picked, and shown as its label. */
  prompt: string
}

const TOOL_SUGGESTIONS: ToolSuggestion[] = [
  // The web search (lib/tools/search.ts).
  { prompt: "Search the web for this week's AI news" },
  // The plan to review and approve (lib/tools/plan.ts).
  { prompt: "Make a plan to launch a portfolio site" },
]

export { TOOL_SUGGESTIONS }
export type { ToolSuggestion }
