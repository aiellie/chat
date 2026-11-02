"use client"

import { GlobalSearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import { StreamText } from "@/components/aiellie/stream-text"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

// The names the chat route gives its search tool, whichever way the request
// went: Google's own is fixed; the rest are called web_search.
const SEARCH_PARTS = new Set(["tool-web_search", "tool-google_search"])

/** A page a search turned up, with what's known of it for a preview. */
type Found = { url: string; title?: string; snippet?: string; date?: string }

type SearchPart = {
  type: string
  state: string
  input?: unknown
  output?: unknown
}

const record = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined

/**
 * The pages a search turned up. Each search returns them its own way: the
 * Gateway's as `results`, Anthropic's as a plain list, OpenAI's as `sources`.
 */
function foundIn(output: unknown): Found[] {
  const list = Array.isArray(output)
    ? output
    : (record(output)?.results ?? record(output)?.sources)
  if (!Array.isArray(list)) return []
  const text = (value: unknown) =>
    typeof value === "string" && value ? value : undefined
  return list.flatMap((item) => {
    const entry = record(item)
    return typeof entry?.url === "string"
      ? [
          {
            url: entry.url,
            title: text(entry.title),
            // The Gateway's search gives an excerpt and a date; Anthropic's
            // gives how old the page is.
            snippet: text(entry.snippet),
            date: text(entry.date) ?? text(entry.pageAge),
          },
        ]
      : []
  })
}

/** What was searched for: the input's query, or the one OpenAI reports. */
function queriesIn(part: SearchPart): string[] {
  const query =
    record(part.input)?.query ?? record(record(part.output)?.action)?.query
  if (typeof query === "string") return [query]
  if (Array.isArray(query))
    return query.filter((each) => typeof each === "string")
  return []
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * A page however a link to it is written: without its fragment, the
 * tracking OpenAI and others add, a trailing slash or "www.".
 */
function pageKey(href: string) {
  try {
    const url = new URL(href)
    for (const name of [...url.searchParams.keys()])
      if (name.startsWith("utm_")) url.searchParams.delete(name)
    return `${hostOf(href)}${url.pathname.replace(/\/+$/, "")}${url.search}`
  } catch {
    return href
  }
}

// Where a markdown link goes: [text](https://…), or <https://…> in brackets.
const LINKED = /\]\(\s*<?(https?:\/\/[^\s)>]+)/g

/**
 * The pages a reply found, those its text links to first, in the order it
 * first links to them, so its citations count up from 1 as it reads.
 */
function citedFirst(found: Found[], text: string) {
  const order = new Map<string, number>()
  for (const [, href] of text.matchAll(LINKED)) {
    const key = pageKey(href)
    if (!order.has(key)) order.set(key, order.size)
  }
  const rank = (page: Found) => order.get(pageKey(page.url)) ?? order.size
  return [...found].sort((a, b) => rank(a) - rank(b))
}

/** A reply's web searches, and what they found, if it searched at all. */
function searchesIn(message: UIMessage) {
  const searches = message.parts.filter((part) =>
    SEARCH_PARTS.has(part.type)
  ) as SearchPart[]
  const found = new Map<string, Found>()
  for (const page of [
    ...searches.flatMap((part) => foundIn(part.output)),
    // Google and OpenAI also name the pages they used as sources.
    ...message.parts.flatMap((part) =>
      part.type === "source-url" ? [{ url: part.url, title: part.title }] : []
    ),
  ])
    if (!found.has(page.url)) found.set(page.url, page)
  return {
    searches,
    queries: searches.flatMap(queriesIn),
    found: [...found.values()],
  }
}

/**
 * A reply's web search, as a trace line: shimmering while it runs, with what
 * it's searching for written out as it comes, then how many pages came back,
 * opening onto them as links.
 */
function WebSearch({
  queries,
  found,
  searching = false,
  typing = false,
  className,
}: {
  queries: string[]
  found: Found[]
  /** Whether a search is still running. */
  searching?: boolean
  /** Whether what it's searching for is still coming in. */
  typing?: boolean
  className?: string
}) {
  const query = queries.at(-1)

  return (
    <Trace data-slot="web-search" className={className}>
      <TraceCollapsible>
        <TraceCollapsibleTrigger disabled={found.length === 0}>
          <TraceLine status={searching ? "running" : undefined}>
            <TraceIcon>
              <HugeiconsIcon icon={GlobalSearchIcon} />
            </TraceIcon>
            <TraceTitle>
              {searching ? "Searching the web" : "Searched the web"}
              {query ? (
                <>
                  {" for “"}
                  {/* Written out as the model types it. A new search writes
                      its own. */}
                  <StreamText
                    key={queries.length}
                    text={query}
                    streaming={typing}
                    revealInitial={searching}
                    inlineCode={false}
                    className="whitespace-nowrap"
                  />
                  ”
                </>
              ) : null}
            </TraceTitle>
            {found.length > 0 ? (
              <TraceDescription>
                {found.length} {found.length === 1 ? "result" : "results"}
              </TraceDescription>
            ) : null}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <ul className="flex flex-col gap-1.5">
            {found.map((page) => (
              <li key={page.url} className="min-w-0">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-baseline gap-2 text-sm hover:text-foreground"
                >
                  <span className="min-w-0 truncate">
                    {page.title || hostOf(page.url)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground/70">
                    {hostOf(page.url)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}

export { citedFirst, hostOf, pageKey, searchesIn, WebSearch }
export type { Found }
