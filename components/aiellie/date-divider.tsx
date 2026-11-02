import * as React from "react"

import { cn } from "@/lib/utils"

const DAY = 24 * 60 * 60 * 1000

const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" })
const thisYear = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
})
const otherYear = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const time = new Intl.DateTimeFormat(undefined, { timeStyle: "short" })

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** A value equal for two times on the same day, here. */
function dayOf(at: number) {
  return startOfDay(new Date(at)).getTime()
}

/** "Today", "Yesterday", a weekday within the week, then a date. */
function dayLabel(at: number, now = Date.now()) {
  const days = Math.round((dayOf(now) - dayOf(at)) / DAY)
  const date = new Date(at)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days > 1 && days < 7) return weekday.format(date)
  return date.getFullYear() === new Date(now).getFullYear()
    ? thisYear.format(date)
    : otherYear.format(date)
}

/** The time of day, with the day in front unless it's today. */
function timeLabel(at: number, now = Date.now()) {
  const clock = time.format(new Date(at))
  return dayOf(at) === dayOf(now) ? clock : `${dayLabel(at, now)}, ${clock}`
}

/**
 * The day of what follows it, as plain centred caption text: the messages
 * already set the thread apart, so lines either side would only add weight.
 */
function DateDivider({
  at,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** Any time on the day, in milliseconds. */
  at: number
}) {
  const label = dayLabel(at)

  return (
    <div
      role="separator"
      aria-label={label}
      data-slot="date-divider"
      className={cn(
        "flex justify-center text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <time dateTime={new Date(at).toISOString()}>{label}</time>
    </div>
  )
}

export { DateDivider, dayLabel, dayOf, timeLabel }
