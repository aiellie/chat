"use client"

import * as React from "react"
import { Globe02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { hostOf, type Found } from "@/components/aiellie/web-search"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

// Pills shown before the rest fold behind a "+N more" pill.
const SHOWN = 6

const day = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

/** A date as the page gave it, or as-is when it isn't one, like "2 days ago". */
function dateLabel(value?: string) {
  if (!value) return undefined
  // A bare day would be read as midnight UTC, the day before in the Americas.
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = bare
    ? new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? value : day.format(date)
}

/** The site's icon, or a globe where it has none to give. */
function SiteIcon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = React.useState(false)
  if (failed)
    return (
      <HugeiconsIcon
        aria-hidden
        icon={Globe02Icon}
        className={cn("size-3.5 shrink-0", className)}
      />
    )
  return (
    // An outside image with nothing for next/image to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=32`}
      alt=""
      onError={() => setFailed(true)}
      className={cn("size-3.5 shrink-0 rounded-sm", className)}
    />
  )
}

/** One source: a pill that opens the page, previewing it on hover. */
function Source({ source }: { source: Found }) {
  const host = hostOf(source.url)
  const date = dateLabel(source.date)

  return (
    <HoverCard>
      <HoverCardTrigger
        href={source.url}
        target="_blank"
        rel="noreferrer"
        delay={300}
        data-slot="source"
        className="inline-flex h-6 max-w-48 min-w-0 items-center gap-1.5 rounded-full border bg-card px-2 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring"
      >
        <SiteIcon url={source.url} />
        <span className="min-w-0 truncate">{host}</span>
      </HoverCardTrigger>
      {/* Glass, as the app's popovers are. */}
      <HoverCardContent
        side="top"
        align="start"
        className="flex w-80 flex-col gap-1.5 bg-popover p-3 backdrop-blur-xs supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/70"
      >
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <SiteIcon url={source.url} />
          <span className="min-w-0 truncate">{host}</span>
          {date ? (
            <span className="shrink-0 text-muted-foreground/70">· {date}</span>
          ) : null}
        </div>
        <p className="line-clamp-2 font-medium">{source.title ?? host}</p>
        {source.snippet ? (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {source.snippet}
          </p>
        ) : null}
        <p className="truncate text-xs text-muted-foreground/70">
          {source.url}
        </p>
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * The pages a reply drew on, as a row of pills under it. Each opens its page
 * in a new tab and previews it on hover. Past the first few, the rest wait
 * behind a pill that shows them.
 */
function Sources({
  sources,
  className,
}: {
  sources: Found[]
  className?: string
}) {
  const [all, setAll] = React.useState(false)
  const shown = all ? sources : sources.slice(0, SHOWN)
  const hidden = sources.length - shown.length

  return (
    <div
      data-slot="sources"
      role="list"
      aria-label="Sources"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {shown.map((source) => (
        <div key={source.url} role="listitem" className="min-w-0">
          <Source source={source} />
        </div>
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="inline-flex h-6 items-center rounded-full border bg-card px-2 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring"
        >
          +{hidden} more
        </button>
      ) : null}
    </div>
  )
}

export { SiteIcon, Sources }
