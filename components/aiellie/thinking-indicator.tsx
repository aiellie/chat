"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Status, StatusIndicator } from "@/components/ui/status"

// "12s", "2m 5s". Anything under a second still reads as one.
function formatDuration(seconds: number) {
  const whole = Math.max(1, Math.round(seconds))
  if (whole < 60) return `${whole}s`
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`
}

function useElapsed(startedAt?: Date | number) {
  const [elapsed, setElapsed] = React.useState(0)
  const from = startedAt === undefined ? undefined : Number(startedAt)

  React.useEffect(() => {
    const start = from ?? Date.now()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [from])

  return elapsed
}

function ThinkingIndicator({
  startedAt,
  children = "Thinking",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  /** When the work began, to count the seconds from. Defaults to when this appears. */
  startedAt?: Date | number
}) {
  const elapsed = useElapsed(startedAt)

  return (
    <span
      data-slot="thinking-indicator"
      // Announces what it's doing as that changes. The seconds are left out,
      // or it would speak every one.
      role="status"
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-2 text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      <Status
        variant="live"
        pulse
        className="border-0 bg-transparent p-0 dark:bg-transparent"
      >
        <StatusIndicator />
      </Status>
      <span className="shimmer min-w-0 truncate motion-reduce:animate-none">
        {children}
      </span>
      {elapsed > 0 ? (
        <span aria-hidden className="shrink-0 tabular-nums">
          · {formatDuration(elapsed)}
        </span>
      ) : null}
    </span>
  )
}

export { ThinkingIndicator, formatDuration }
