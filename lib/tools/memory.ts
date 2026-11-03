import { tool } from "ai"
import { z } from "zod"

// The tools a model calls to read and keep facts about the person across
// chats. Neither has an `execute`: memories live in the browser, so the call
// goes to the client, where the chat answers it from
// components/memory-store.ts and sends the result back as the tool's output.
// The thread draws each call, so the person sees every read and save.

/**
 * The tools' names. The memory line in components/aiellie/memory-trace.tsx
 * looks for parts named `tool-${RECALL_MEMORY_TOOL}` and
 * `tool-${SAVE_MEMORY_TOOL}`, and keeps its own copy of the names.
 */
const RECALL_MEMORY_TOOL = "recall_memory"
const SAVE_MEMORY_TOOL = "save_memory"

const recallMemoryTool = tool({
  description:
    "Look up what the person has asked you to remember about them. Use it before answering anything where their preferences, circumstances or past choices would change the answer.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "A few words naming what you need to know, like 'diet' or 'where they live'."
      ),
  }),
})

const saveMemoryTool = tool({
  description:
    "Keep a fact about the person for later chats. Use it only when they ask you to remember something.",
  inputSchema: z.object({
    text: z
      .string()
      .describe(
        "The fact as one short sentence about the person, like 'Takes their coffee black'."
      ),
  }),
})

const MEMORY_INSTRUCTIONS = `You can remember things about the person across chats. Before answering anything personal, where what they've told you before would change the answer, call ${RECALL_MEMORY_TOOL} first, and use what comes back without saying you looked it up. Call ${SAVE_MEMORY_TOOL} only when they ask you to remember something, never on your own. Never save passwords, keys, account or card numbers, health details or anything else sensitive, even when asked: say you won't keep it. After a save, confirm it in a few words.`

export {
  MEMORY_INSTRUCTIONS,
  RECALL_MEMORY_TOOL,
  recallMemoryTool,
  SAVE_MEMORY_TOOL,
  saveMemoryTool,
}
