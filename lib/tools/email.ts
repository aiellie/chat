import { tool } from "ai"
import { z } from "zod"

// The tool a model calls to send an email. It needs the person's approval
// first: the call stops at `approval-requested`, `EmailApproval` in
// components/aiellie/email-approval.tsx shows the draft with Send and Don't
// send, and only an approval lets `execute` run. It sends through Resend.

/**
 * The tool's name. `EmailApproval` looks for parts named
 * `tool-${EMAIL_TOOL}`, and keeps its own copy of the name.
 */
const EMAIL_TOOL = "send_email"

// Who it sends as. The domain has to be verified in Resend.
const FROM = process.env.EMAIL_FROM ?? "Ellie <hello@aiellie.dev>"

const emailTool = tool({
  description:
    "Send an email. The person sees the full draft and approves or declines it before anything is sent.",
  inputSchema: z.object({
    to: z.email().describe("The recipient's email address."),
    subject: z.string().describe("A short subject line."),
    body: z
      .string()
      .describe(
        "The whole message as plain text, greeting and sign-off included."
      ),
  }),
  needsApproval: true,
  execute: async ({ to, subject, body }) => {
    const key = process.env.RESEND_API_KEY
    if (!key)
      throw new Error("Sending isn't set up: add RESEND_API_KEY to .env.local.")

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, text: body }),
    })
    const result = (await response.json().catch(() => ({}))) as {
      id?: string
      message?: string
    }
    if (!response.ok || !result.id)
      throw new Error(result.message ?? `Resend answered ${response.status}.`)

    return { id: result.id, to, sentAt: Date.now() }
  },
})

const EMAIL_INSTRUCTIONS = `When you're asked to send an email, call ${EMAIL_TOOL} with the finished draft, and write nothing before the call: the chat shows the draft for the person to approve. If you don't know the recipient's address, ask for it first. Once it's sent, say so in one short sentence. If the person declined, don't send it another way: ask what to change.`

export { EMAIL_INSTRUCTIONS, EMAIL_TOOL, emailTool }
