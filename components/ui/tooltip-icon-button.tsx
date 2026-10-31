"use client"

import { type ComponentPropsWithRef, forwardRef } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
  tooltip: string
  /** The keys that do the same, shown after the tooltip, e.g. "⌘K". */
  shortcut?: string
  side?: "top" | "bottom" | "left" | "right"
}

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(
  (
    { children, tooltip, shortcut, side = "bottom", className, ...rest },
    ref
  ) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                {...rest}
                className={cn(
                  "size-6 rounded-lg p-1 active:scale-90 [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground",
                  className
                )}
                ref={ref}
              />
            }
          >
            {children}
            <span className="sr-only">{tooltip}</span>
          </TooltipTrigger>
          <TooltipContent side={side}>
            {tooltip}
            {shortcut ? (
              <kbd
                data-slot="kbd"
                className="rounded-sm bg-background/15 px-1 font-sans"
              >
                {shortcut}
              </kbd>
            ) : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)

TooltipIconButton.displayName = "TooltipIconButton"
