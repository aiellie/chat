"use client"

import * as React from "react"
import { Link01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

// Only a web page can be cited. Anything else renders as its number alone.
function urlOf(href: string) {
  try {
    const url = new URL(href)
    return url.protocol === "https:" || url.protocol === "http:" ? url : null
  } catch {
    return null
  }
}

function SiteIcon({ origin }: { origin: string }) {
  const [failed, setFailed] = React.useState(false)

  return failed ? (
    <HugeiconsIcon aria-hidden icon={Link01Icon} className="size-3 shrink-0" />
  ) : (
    // A favicon is tiny and from anywhere, so next/image has nothing to add.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${origin}/favicon.ico`}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-3.5 shrink-0 rounded-sm object-contain"
    />
  )
}

const mark =
  "mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-transparent bg-muted px-1 align-[0.125em] font-sans text-[0.6875rem] leading-none font-medium text-muted-foreground tabular-nums no-underline! transition-colors duration-80 outline-none motion-reduce:transition-none"

function InlineCitation({
  href,
  index,
  title,
  description,
  className,
  ...props
}: Omit<React.ComponentProps<"a">, "href" | "children" | "title"> & {
  href: string
  /** The number it shows, counting from 1 in the order sources are listed. */
  index: number
  /** The page's title, shown on its card. */
  title?: string
  description?: string
}) {
  const url = urlOf(href)

  if (!url) {
    return (
      <span
        data-slot="inline-citation"
        className={cn(mark, className)}
        aria-label={`Source ${index}`}
      >
        {index}
      </span>
    )
  }

  const host = url.hostname.replace(/^www\./, "")

  return (
    <HoverCard>
      <HoverCardTrigger
        data-slot="inline-citation"
        href={url.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`Source ${index}: ${title ?? host}`}
        className={cn(
          mark,
          "hover:bg-accent hover:text-foreground focus-visible:border-ring data-popup-open:bg-accent data-popup-open:text-foreground",
          className
        )}
        {...props}
      >
        {index}
      </HoverCardTrigger>
      <HoverCardContent
        data-slot="inline-citation-preview"
        side="top"
        className="flex w-72 flex-col gap-1"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-xs">
          <SiteIcon origin={url.origin} />
          <span className="truncate">{host}</span>
        </span>
        <span className="line-clamp-2 text-sm font-medium">
          {title ?? url.href}
        </span>
        {description ? (
          <span className="line-clamp-3 text-xs">{description}</span>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}

export { InlineCitation }
