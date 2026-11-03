import { tool } from "ai"
import { z } from "zod"

// The tool a model calls to show the person a plan before it acts on it. It has no `execute`, so the call goes to the client, where
// `PlanReview` lets the person edit it and approve or dismiss it. Their
// answer comes back as the tool's output, and an approval sends the chat on.

/**
 * The tool's name. `PlanReview` in components/aiellie/plan-review.tsx looks
 * for parts named `tool-${PLAN_TOOL}`, and keeps its own copy of the name.
 */
const PLAN_TOOL = "propose_plan"

const planTool = tool({
  description:
    "Show the person a plan to review before you carry it out. They can reword, reorder, add and remove steps, then approve or dismiss it. Use it whenever you're asked to make or propose a plan, and before multi-step work the person should agree to first.",
  inputSchema: z.object({
    title: z.string().describe("What the plan is for, in a few words."),
    steps: z
      .array(
        z.object({
          title: z
            .string()
            .describe(
              "The step as a short imperative, like 'Audit the routes'."
            ),
          detail: z
            .string()
            .optional()
            .describe("A sentence on how, only where the title needs it."),
        })
      )
      .min(1)
      .max(12),
  }),
})

const PLAN_INSTRUCTIONS = `When you're asked to make a plan, call ${PLAN_TOOL} with it rather than writing it out, and write nothing before the call: the chat draws the plan for the person to edit. Its result is their answer. If they approved, carry out the plan as it comes back, which may differ from what you proposed, without restating it. If they sent it back, it comes with a note on what to change and the plan as they left it: call ${PLAN_TOOL} again with a new plan that does what the note asks and keeps their edits. If they dismissed it, don't carry it out. If they skipped it, they wrote their next message instead: answer that.`

export { PLAN_INSTRUCTIONS, PLAN_TOOL, planTool }
