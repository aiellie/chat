import * as React from "react"

import { cn } from "@/lib/utils"

// What a new chat shows in place of its thread, until its first message.
function ChatEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-empty"
      className={cn(
        "mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-center gap-2 px-4 pt-10 text-center",
        className
      )}
      {...props}
    />
  )
}

function ChatEmptyTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="chat-empty-title"
      className={cn("text-2xl font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function ChatEmptyDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="chat-empty-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { ChatEmpty, ChatEmptyTitle, ChatEmptyDescription }
