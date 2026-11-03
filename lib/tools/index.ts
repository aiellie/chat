import type { ToolSet } from "ai"

import type { ApiKeys } from "@/lib/api-keys"
import { EMAIL_INSTRUCTIONS, EMAIL_TOOL, emailTool } from "@/lib/tools/email"
import { PLAN_INSTRUCTIONS, PLAN_TOOL, planTool } from "@/lib/tools/plan"
import { SEARCH_INSTRUCTIONS, searchTools } from "@/lib/tools/search"
import { getWeather } from "@/lib/tools/weather"

// Server only: every tool the model can be given, one file each in this
// folder, put together for the chat route. They all go to the one request,
// since the model picks among them as it replies. A new tool gets its file
// here, a place in `chatTools`, and an entry in catalog.ts, which the Tools
// page and a new chat's suggestions read.

/** The tools a reply gets, and what the model is told about using them. */
function chatTools(
  modelId: string,
  keys: ApiKeys
): { tools: ToolSet; instructions: string } {
  // All of them, every time: the model decides when one is needed. Search
  // only where the model's route has one.
  const web = searchTools(modelId, keys)
  return {
    tools: {
      ...web,
      [PLAN_TOOL]: planTool,
      get_weather: getWeather,
      [EMAIL_TOOL]: emailTool,
    },
    instructions: [
      PLAN_INSTRUCTIONS,
      EMAIL_INSTRUCTIONS,
      web ? SEARCH_INSTRUCTIONS : undefined,
    ]
      .filter(Boolean)
      .join("\n\n"),
  }
}

export { chatTools }
