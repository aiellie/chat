"use client"

import * as React from "react"

import { EditableTitle } from "@/components/ui/editable-title"
import { cn } from "@/lib/utils"

// The chat's bar, which sits in the main panel's header.
function ChatHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-header"
      className={cn("flex min-w-0 flex-1 items-center gap-1", className)}
      {...props}
    />
  )
}

// The chat's name, renamed in place by clicking it. Without `onRename`, it's
// plain text.
function ChatHeaderTitle({
  title,
  onRename,
  className,
}: {
  title: string
  onRename?: (title: string) => void
  className?: string
}) {
  const [editing, setEditing] = React.useState(false)

  return (
    <EditableTitle
      data-slot="chat-header-title"
      title={title}
      editing={editing}
      onEditingChange={setEditing}
      onRename={onRename}
      label="Chat name"
      className={className}
    />
  )
}

export { ChatHeader, ChatHeaderTitle }
