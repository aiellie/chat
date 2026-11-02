import * as React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

/** A titled block in the details panel. */
export function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/**
 * A titled card of rows — the shape every `*-details.tsx` renders into.
 * Rows sit inside the padding so their dividers stay inset from the border.
 */
export function DetailList({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <DetailSection title={title}>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border px-3">
        {children}
      </div>
    </DetailSection>
  )
}

/** One row: icon + name on the left, the value or description on the right. */
export function DetailRow({
  icon,
  label,
  value,
  className,
}: {
  icon?: IconSvgElement
  label: string
  value?: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="flex shrink-0 items-center gap-2 text-xs">
        {/* Slugs we have no entry for keep the icon column, so labels in the
            same card still line up. */}
        {icon ? (
          <HugeiconsIcon aria-hidden icon={icon} className="size-4" />
        ) : (
          <span className="size-4" />
        )}
        {label}
      </span>
      {value == null || value === "" ? null : (
        <span
          className={cn(
            "text-end text-xs text-pretty text-muted-foreground",
            className
          )}
        >
          {value}
        </span>
      )}
    </div>
  )
}

/** Falls back to something readable for a slug we have no entry for. */
export function humanize(slug: string) {
  const words = slug.replace(/[-_]/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
