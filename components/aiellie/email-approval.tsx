"use client"

import type { ToolUIPart } from "ai"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status"
import { cn } from "@/lib/utils"

/**
 * The tool's name, as the chat route gives it to the model. Parts named
 * `tool-${EMAIL_TOOL}` are drawn by `EmailApproval`.
 */
const EMAIL_TOOL = "send_email"

type EmailDraft = { to?: string; subject?: string; body?: string }
type EmailSent = { id: string; to: string; sentAt: number }

type Stage = "drafting" | "waiting" | "sending" | "sent" | "declined" | "failed"

// Where the call stands, from its part's state. An answer is shown as soon
// as it's given, before the server hears it.
function stageOf(part: ToolUIPart): Stage {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return "drafting"
    case "approval-requested":
      return "waiting"
    case "approval-responded":
      return part.approval.approved ? "sending" : "declined"
    case "output-available":
      return "sent"
    case "output-denied":
      return "declined"
    default:
      return "failed"
  }
}

const sentTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

/**
 * An email the model wants to send, shown in full for the person to send or
 * decline before anything leaves. While the model writes it, its fields fill
 * in; once answered, it's read-only.
 */
function EmailApproval({
  part,
  onRespond,
  disabled = false,
  className,
}: {
  part: ToolUIPart
  /**
   * Answers the request, by its approval id. Without it, or once answered,
   * the card offers no actions.
   */
  onRespond?: (approvalId: string, approved: boolean) => void
  /** Holds the actions, such as while a reply is still coming in. */
  disabled?: boolean
  className?: string
}) {
  const stage = stageOf(part)
  const draft = (part.input ?? {}) as EmailDraft
  const sent =
    part.state === "output-available" ? (part.output as EmailSent) : undefined
  const working = stage === "drafting" || stage === "sending"
  const declined = stage === "declined"
  const approval = part.state === "approval-requested" ? part.approval : null

  return (
    <div
      data-slot="email-approval"
      data-status={working ? "running" : undefined}
      aria-busy={working || undefined}
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 rounded-xl border border-border/60 p-4 text-sm",
        declined && "text-muted-foreground",
        className
      )}
    >
      <header className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">Email</span>
        {/* Its state, said as it changes. In brand only while it works. */}
        <span role="status" className="ms-auto shrink-0">
          {stage === "drafting" ? (
            <Status variant="live" pulse>
              <StatusIndicator />
              <StatusLabel>Drafting</StatusLabel>
            </Status>
          ) : stage === "waiting" ? (
            <Status variant="pending">
              <StatusIndicator />
              <StatusLabel>Needs approval</StatusLabel>
            </Status>
          ) : stage === "sending" ? (
            <Status variant="live" pulse>
              <StatusIndicator />
              <StatusLabel>Sending</StatusLabel>
            </Status>
          ) : stage === "sent" ? (
            <Status variant="success">
              <StatusIndicator />
              <StatusLabel>
                Sent
                {sent ? (
                  <span className="tabular-nums">
                    {" "}
                    · {sentTime(sent.sentAt)}
                  </span>
                ) : null}
              </StatusLabel>
            </Status>
          ) : stage === "declined" ? (
            <Status variant="muted">
              <StatusLabel>Not sent</StatusLabel>
            </Status>
          ) : stage === "failed" ? (
            <Status variant="destructive">
              <StatusIndicator />
              <StatusLabel>Failed</StatusLabel>
            </Status>
          ) : null}
        </span>
      </header>

      {/* The envelope: who it goes to and what it's about. */}
      <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">To</dt>
        <dd className="min-w-0 wrap-break-word">
          {draft.to ?? <Skeleton className="my-0.5 h-4 w-40" />}
        </dd>
        <dt className="text-muted-foreground">Subject</dt>
        <dd
          className={cn(
            "min-w-0 font-medium wrap-break-word",
            declined && "font-normal"
          )}
        >
          {draft.subject ?? <Skeleton className="my-0.5 h-4 w-56" />}
        </dd>
      </dl>

      {/* As written: the person approves exactly these words. */}
      {draft.body ? (
        <p className="min-w-0 text-pretty wrap-break-word whitespace-pre-wrap">
          {draft.body}
        </p>
      ) : (
        <div aria-hidden className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {stage === "failed" && part.errorText ? (
        <p className="text-xs text-muted-foreground">{part.errorText}</p>
      ) : null}
      {stage === "declined" && part.approval?.reason ? (
        <p className="text-xs">{part.approval.reason}</p>
      ) : null}

      {approval && onRespond ? (
        <footer className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => onRespond(approval.id, true)}
          >
            Send email
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onRespond(approval.id, false)}
          >
            Don&apos;t send
          </Button>
        </footer>
      ) : null}
    </div>
  )
}

export { EMAIL_TOOL, EmailApproval }
