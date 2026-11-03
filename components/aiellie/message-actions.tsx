"use client"

import * as React from "react"
import {
  Bookmark02Icon,
  Copy01Icon,
  Flag02Icon,
  GitBranchIcon,
  MoreHorizontalIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { Textarea } from "@/components/ui/textarea"
import {
  TooltipIconButton,
  type TooltipIconButtonProps,
} from "@/components/ui/tooltip-icon-button"
import { cn } from "@/lib/utils"

/** A row of small buttons for what can be done with a message. */
function MessageActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-actions"
      role="toolbar"
      aria-label="Message actions"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  )
}

/** One action: an icon button named by its tooltip. */
function MessageAction({
  className,
  side = "bottom",
  ...props
}: TooltipIconButtonProps) {
  return (
    <TooltipIconButton
      data-slot="message-action"
      type="button"
      side={side}
      className={cn("size-6 rounded-md p-1", className)}
      {...props}
    />
  )
}

/** Copies the message's text, and shows a tick for a moment once it has. */
function MessageCopyAction({
  value,
  ...props
}: Omit<TooltipIconButtonProps, "tooltip" | "onClick" | "children"> & {
  value: string
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <MessageAction
      tooltip={copied ? "Copied" : "Copy"}
      onClick={() =>
        navigator.clipboard
          .writeText(value)
          .then(() => setCopied(true))
          .catch(() => {})
      }
      {...props}
    >
      <HugeiconsIcon aria-hidden icon={copied ? Tick02Icon : Copy01Icon} />
    </MessageAction>
  )
}

/**
 * Saves the message to memory: opens a dialog with its text to cut down to
 * the fact worth keeping, then shows a tick for a moment once it's saved.
 */
function MessageSaveAction({
  text,
  onSave,
  ...props
}: Omit<TooltipIconButtonProps, "tooltip" | "onClick" | "children"> & {
  /** The message's text, which the dialog starts from. */
  text: string
  /** Keeps the text as edited. */
  onSave: (text: string) => void | Promise<void>
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(text)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!saved) return
    const timeout = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timeout)
  }, [saved])

  const save = async () => {
    await onSave(draft.trim())
    setOpen(false)
    setSaved(true)
  }

  return (
    <>
      <MessageAction
        tooltip={saved ? "Saved to memory" : "Save to memory"}
        onClick={() => {
          setDraft(text)
          setOpen(true)
        }}
        {...props}
      >
        <HugeiconsIcon aria-hidden icon={saved ? Tick02Icon : Bookmark02Icon} />
      </MessageAction>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to memory</DialogTitle>
            <DialogDescription>
              Cut it down to what’s worth remembering in later chats.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Memory"
            rows={4}
            className="max-h-60"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!draft.trim()} onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type Rating = "up" | "down"

/** A thumb up or down, held down while it's the message's rating. */
function MessageRateAction({
  value,
  pressed = false,
  onPressedChange,
  className,
  ...props
}: Omit<TooltipIconButtonProps, "tooltip" | "onClick" | "children"> & {
  value: Rating
  pressed?: boolean
  onPressedChange: (pressed: boolean) => void
}) {
  return (
    <MessageAction
      tooltip={value === "up" ? "Good response" : "Bad response"}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(pressed && "bg-muted [&_svg]:text-foreground", className)}
      {...props}
    >
      <HugeiconsIcon
        aria-hidden
        icon={value === "up" ? ThumbsUpIcon : ThumbsDownIcon}
      />
    </MessageAction>
  )
}

// Spoken, Markdown's marks would be read out, and code makes no sense aloud.
function spokenText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?(```|$)/g, " Code block. ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-+*]|\d+\.)\s+/gm, "")
    .replace(/[*_~|]+/g, "")
}

/** Reads text aloud with the browser's voice, or stops it reading. */
function useReadAloud(text: string) {
  const [reading, setReading] = React.useState(false)

  // Leaving the message stops what it was reading.
  React.useEffect(() => {
    if (!reading) return
    return () => window.speechSynthesis.cancel()
  }, [reading])

  const toggle = () => {
    // One voice at a time: this also ends another message's reading.
    window.speechSynthesis.cancel()
    if (reading) return
    const utterance = new SpeechSynthesisUtterance(spokenText(text))
    utterance.onend = () => setReading(false)
    utterance.onerror = () => setReading(false)
    window.speechSynthesis.speak(utterance)
    setReading(true)
  }

  return { reading, toggle }
}

const REASONS = [
  "Inaccurate",
  "Harmful or offensive",
  "Not helpful",
  "Something else",
] as const

type Report = { reason: (typeof REASONS)[number]; details: string }

function ReportDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (report: Report) => void
}) {
  const [reason, setReason] = React.useState<Report["reason"]>()
  const [details, setDetails] = React.useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this response</DialogTitle>
          <DialogDescription>What was wrong with it?</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {REASONS.map((option) => (
            <Button
              key={option}
              role="radio"
              aria-checked={reason === option}
              variant={reason === option ? "default" : "outline"}
              size="sm"
              onClick={() => setReason(option)}
            >
              {option}
            </Button>
          ))}
        </div>
        <Textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Anything else to add (optional)"
          aria-label="Details"
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!reason}
            onClick={() => {
              if (!reason) return
              onSubmit({ reason, details: details.trim() })
              onOpenChange(false)
            }}
          >
            Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * A more button whose menu reads the message aloud, branches the chat from
 * it, or reports it. Branch and report are left out without their handlers.
 */
function MessageMoreActions({
  text,
  onBranch,
  onReport,
  reported = false,
}: {
  /** The message's text, as Markdown. */
  text: string
  onBranch?: () => void
  onReport?: (report: Report) => void
  /** Already reported, so it can't be again. */
  reported?: boolean
}) {
  const { reading, toggle } = useReadAloud(text)
  const [reporting, setReporting] = React.useState(false)

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <MessageAction
              tooltip="More"
              className="data-popup-open:bg-muted data-popup-open:[&_svg]:text-foreground"
            />
          }
        >
          <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
        </MenuTrigger>
        <MenuContent side="bottom" align="start">
          <MenuItem onClick={toggle}>
            <HugeiconsIcon
              aria-hidden
              icon={reading ? VolumeOffIcon : VolumeHighIcon}
            />
            {reading ? "Stop reading" : "Read aloud"}
          </MenuItem>
          {onBranch ? (
            <MenuItem onClick={onBranch}>
              <HugeiconsIcon aria-hidden icon={GitBranchIcon} />
              Branch in new chat
            </MenuItem>
          ) : null}
          {onReport ? (
            <>
              <MenuSeparator />
              <MenuItem
                variant="destructive"
                disabled={reported}
                onClick={() => setReporting(true)}
              >
                <HugeiconsIcon aria-hidden icon={Flag02Icon} />
                {reported ? "Reported" : "Report"}
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>
      {onReport ? (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          onSubmit={onReport}
        />
      ) : null}
    </>
  )
}

export {
  MessageAction,
  MessageActions,
  MessageCopyAction,
  MessageMoreActions,
  MessageRateAction,
  MessageSaveAction,
}
export type { Rating, Report }
