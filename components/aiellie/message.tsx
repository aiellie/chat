"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

type MessageVariant =
  "primary" | "secondary" | "tinted" | "outline" | "ghost" | "destructive"

function Message({
  className,
  align = "start",
  variant = "secondary",
  streaming = false,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  variant?: MessageVariant
  /** Shows a caret after the last part while the reply is still being written. */
  streaming?: boolean
}) {
  return (
    <div
      data-slot="message"
      data-align={align}
      data-variant={variant}
      data-streaming={streaming || undefined}
      aria-busy={streaming || undefined}
      className={cn(
        "group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse",
        className
      )}
      {...props}
    />
  )
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        "flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8",
        "[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end",
        "[&>[data-slot=message-part]+[data-slot=message-part]]:-mt-1",
        "group-data-streaming/message:[&>[data-slot=message-part]:not(:has(~[data-slot=message-part])):not(:has([data-slot=stream-text],[data-slot=response]))>[data-slot=message-caret]]:inline-block",
        className
      )}
      {...props}
    />
  )
}

function MessagePart({
  className,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "relative w-fit max-w-[80%] min-w-0 rounded-xl border border-transparent px-3 py-1 text-sm leading-6 wrap-break-word whitespace-pre-wrap",
          "[button]:text-start [button,a]:transition-colors [button,a]:duration-80 [button,a]:outline-none [button,a]:focus-visible:border-ring [button,a]:motion-reduce:transition-none",
          "not-has-[~[data-slot=message-part]]:group-data-[align=end]/message:rounded-ee-sm not-has-[~[data-slot=message-part]]:group-data-[align=start]/message:rounded-es-sm",
          "group-data-[variant=primary]/message:bg-primary group-data-[variant=primary]/message:text-primary-foreground group-data-[variant=primary]/message:[&:is(button,a):hover]:bg-primary/80",
          "group-data-[variant=secondary]/message:bg-secondary group-data-[variant=secondary]/message:text-secondary-foreground group-data-[variant=secondary]/message:[&:is(button,a):hover]:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
          "group-data-[variant=tinted]/message:bg-primary/6 group-data-[variant=tinted]/message:text-foreground dark:group-data-[variant=tinted]/message:bg-primary/10 group-data-[variant=tinted]/message:[&:is(button,a):hover]:bg-primary/10 dark:group-data-[variant=tinted]/message:[&:is(button,a):hover]:bg-primary/15",
          "group-data-[variant=outline]/message:border-border group-data-[variant=outline]/message:bg-background group-data-[variant=outline]/message:[&:is(button,a):hover]:bg-muted group-data-[variant=outline]/message:[&:is(button,a):hover]:text-foreground dark:group-data-[variant=outline]/message:[&:is(button,a):hover]:bg-input/30",
          "group-data-[variant=ghost]/message:max-w-full group-data-[variant=ghost]/message:rounded-none group-data-[variant=ghost]/message:border-none group-data-[variant=ghost]/message:bg-transparent group-data-[variant=ghost]/message:p-0 group-data-[variant=ghost]/message:[&:is(button,a):hover]:bg-muted group-data-[variant=ghost]/message:[&:is(button,a):hover]:text-foreground dark:group-data-[variant=ghost]/message:[&:is(button,a):hover]:bg-muted/50",
          "group-data-[variant=destructive]/message:bg-destructive/4 group-data-[variant=destructive]/message:text-destructive group-data-[variant=destructive]/message:[&:is(button,a):hover]:bg-destructive/7",
          className
        ),
        children: (
          <>
            {children}
            <span
              aria-hidden
              data-slot="message-caret"
              className="ms-0.5 hidden h-3.5 w-0.5 animate-caret-blink bg-live align-middle motion-reduce:animate-none"
            />
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "message-part",
    },
  })
}

const messageReactions = cva(
  "absolute flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs ring-2 ring-card has-[button]:p-0",
  {
    variants: {
      side: {
        top: "top-0 -translate-y-3/4",
        bottom: "bottom-0 translate-y-3/4",
      },
      align: {
        start: "start-3",
        end: "end-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  }
)

function MessageReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <div
      data-slot="message-reactions"
      data-align={align}
      data-side={side}
      className={cn(messageReactions({ side, align }), className)}
      {...props}
    />
  )
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[variant=ghost]/message:px-0",
        className
      )}
      {...props}
    />
  )
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex max-w-full min-w-0 items-center gap-2 px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end group-data-[variant=ghost]/message:px-0",
        className
      )}
      {...props}
    />
  )
}

function MessageTime({ className, ...props }: React.ComponentProps<"time">) {
  return (
    <time
      data-slot="message-time"
      className={cn(
        "text-xs font-normal text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function MessageActions({
  reveal = "hover",
  className,
  ...props
}: React.ComponentProps<"div"> & { reveal?: "hover" | "always" }) {
  return (
    <div
      data-slot="message-actions"
      role="group"
      aria-label="Message actions"
      className={cn(
        "flex items-center gap-0.5 first:-ms-1 last:-me-1",
        reveal === "hover" &&
          "transition-opacity duration-150 motion-reduce:transition-none pointer-fine:opacity-0 pointer-fine:group-hover/message:opacity-100 pointer-fine:focus-within:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function MessageAction(props: React.ComponentProps<typeof TooltipIconButton>) {
  return <TooltipIconButton {...props} />
}

export {
  Message,
  MessageAction,
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
  MessagePart,
  MessageReactions,
  MessageTime,
}
export type { MessageVariant }
