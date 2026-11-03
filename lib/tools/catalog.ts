/**
 * Every tool the model can use, as the Tools page lists it and a new chat
 * offers it. Plain data, so the browser can read it; the definitions are in
 * this folder's other files, which are server code. A new tool gets an entry
 * here, and an entry changes with its tool.
 */
type ToolEntry = {
  /** A stable key, which the Tools page picks the tool's icon by. */
  id: string
  name: string
  /** The names the model calls it by. */
  calls: string[]
  /** What it does, in a few words, as its row on the Tools page says. */
  summary: string
  /** What runs it. */
  runs: string
  /** Which models get it. */
  models: string
  /** Where it's defined. */
  definition: string
  /** Where the thread draws it, if it shows there. */
  view?: string
  /** Offered above the composer in a new chat, and sent as written. */
  suggestion: string
  /** Where the work on it stands, as the badge on its row. */
  status: "In progress"
}

const TOOLS: ToolEntry[] = [
  {
    id: "web-search",
    name: "Web search",
    // Google's own search is fixed as google_search; the rest are named here.
    calls: ["web_search", "google_search"],
    summary: "Looks things up and cites its sources",
    runs: "The provider, or the Gateway",
    // As PROVIDER_SEARCH in lib/tools/search.ts has it.
    models:
      "Gateway models, and Anthropic, OpenAI and Google with your own key",
    definition: "lib/tools/search.ts",
    view: "components/aiellie/web-search.tsx",
    suggestion: "Search the web for this week's AI news",
    status: "In progress",
  },
  {
    id: "plan",
    name: "Plan",
    calls: ["propose_plan"],
    summary: "Drafts a plan to edit and approve",
    runs: "The chat, which waits for your answer",
    models: "Every model",
    definition: "lib/tools/plan.ts",
    view: "components/aiellie/plan-review.tsx",
    suggestion: "Make a plan to launch a portfolio site",
    status: "In progress",
  },
  {
    id: "weather",
    name: "Weather",
    calls: ["get_weather"],
    summary: "Checks the weather for a place",
    runs: "Your server, with Open-Meteo",
    models: "Every model",
    definition: "lib/tools/weather.ts",
    view: "components/aiellie/weather-card.tsx",
    suggestion: "What's the weather in Lisbon?",
    status: "In progress",
  },
  {
    id: "email",
    name: "Email",
    calls: ["send_email"],
    summary: "Drafts an email and sends it once you approve",
    runs: "Your server, with Resend, after your approval",
    models: "Every model",
    definition: "lib/tools/email.ts",
    view: "components/aiellie/email-approval.tsx",
    suggestion: "Email me a short note saying the email tool works",
    status: "In progress",
  },
]

export { TOOLS }
export type { ToolEntry }
