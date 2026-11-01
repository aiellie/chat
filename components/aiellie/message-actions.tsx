"use client"

import * as React from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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

export { MessageAction, MessageActions, MessageCopyAction }
