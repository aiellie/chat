import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createGateway, gateway, type ToolSet } from "ai"

import type { ApiKeys, ProviderId } from "@/lib/api-keys"
import { routeOf } from "@/lib/providers"

// Server only: searching the web. A provider called directly runs its own
// search, where it has one; through the Gateway, the Gateway runs one for any
// model it serves. components/aiellie/web-search.tsx draws whichever ran, by
// the names given here.

// The provider packages build their tools against a newer copy of the shared
// tool types than `ai` does, which TypeScript won't match up though they're
// the same at runtime.
const toolSet = (tools: Record<string, unknown>) => tools as ToolSet

/**
 * Each provider's own search, keyed as the provider expects: "web_search"
 * where it lets the name be chosen. Mistral and DeepSeek have none.
 */
const PROVIDER_SEARCH: Partial<
  Record<ProviderId, (apiKey: string) => ToolSet>
> = {
  anthropic: (apiKey) =>
    toolSet({
      web_search: createAnthropic({ apiKey }).tools.webSearch_20260318({
        maxUses: 5,
      }),
    }),
  openai: (apiKey) =>
    toolSet({ web_search: createOpenAI({ apiKey }).tools.webSearch({}) }),
  google: (apiKey) =>
    toolSet({
      google_search: createGoogle({ apiKey }).tools.googleSearch({}),
    }),
}

// The model has the search on every reply, so it's told when to use it: only
// when the reply needs it. It cites what it found where it uses it, in the
// form a reply draws as a numbered citation that previews the page.
const SEARCH_INSTRUCTIONS =
  "Search the web only when the reply needs it: when you're asked to, or when it depends on recent events, current figures or specifics you can't be sure of. Otherwise answer from what you know. When you use something a web search found, cite the page right after the sentence that uses it, as a markdown link with a number for its text and the page's address, like [1](https://example.com/page). Cite only pages your searches returned, and don't list them again at the end: the chat shows them under your reply."

/**
 * The web search a model can use, reached the way its request goes, given
 * the keys it came with. None for a provider without one.
 */
function searchTools(modelId: string, keys: ApiKeys): ToolSet | undefined {
  const { key, ...route } = routeOf(modelId, keys.providers)
  if (route.via === "provider" && key)
    return PROVIDER_SEARCH[route.provider]?.(key)
  const provider = keys.gateway
    ? createGateway({ apiKey: keys.gateway })
    : gateway
  return { web_search: provider.tools.perplexitySearch({ maxResults: 8 }) }
}

export { SEARCH_INSTRUCTIONS, searchTools }
