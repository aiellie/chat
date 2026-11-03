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
const UPDATE_MEMORY_TOOL = "update_memory"
const DELETE_MEMORY_TOOL = "delete_memory"

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
    "Keep a fact about the person for later chats. Use it only when they ask you to remember something, and only after recall_memory shows it isn't kept already.",
  inputSchema: z.object({
    text: z
      .string()
      .describe(
        "The fact as one short sentence about the person, like 'Takes their coffee black'."
      ),
  }),
})

const memoryId = z
  .string()
  .describe(`The memory's id, as ${RECALL_MEMORY_TOOL} gave it.`)

const updateMemoryTool = tool({
  description: `Rewrite a memory the person wants changed or corrected. Use ${RECALL_MEMORY_TOOL} first for its id.`,
  inputSchema: z.object({
    id: memoryId,
    text: z
      .string()
      .describe("The memory as it should read now, as one short sentence."),
  }),
})

const deleteMemoryTool = tool({
  description: `Forget a memory: when the person asks you to, or to remove a copy of one that's kept twice. Use ${RECALL_MEMORY_TOOL} first for its id. Call it once for each memory.`,
  inputSchema: z.object({ id: memoryId }),
})

const MEMORY_INSTRUCTIONS = `You can remember things about the person across chats. Before answering anything personal, where what they've told you before would change the answer, call ${RECALL_MEMORY_TOOL} first, and use what comes back without saying you looked it up. Call ${SAVE_MEMORY_TOOL} only when they ask you to remember something, never on your own. Before saving, call ${RECALL_MEMORY_TOOL} with the fact's key words to check it isn't already kept: if a memory already says the same thing, don't save it again and tell them you already remember it. Never save passwords, keys, account or card numbers, health details or anything else sensitive, even when asked: say you won't keep it. When they ask you to change, correct or forget something you remember, or to clear out copies, call ${RECALL_MEMORY_TOOL} for the ids, then ${UPDATE_MEMORY_TOOL} or ${DELETE_MEMORY_TOOL}; keep one of any copies. Never change or forget a memory on your own. After a save, change or deletion, confirm it in a few words.`

export {
  DELETE_MEMORY_TOOL,
  deleteMemoryTool,
  MEMORY_INSTRUCTIONS,
  RECALL_MEMORY_TOOL,
  recallMemoryTool,
  SAVE_MEMORY_TOOL,
  saveMemoryTool,
  UPDATE_MEMORY_TOOL,
  updateMemoryTool,
}
