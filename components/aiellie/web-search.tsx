"use client"

import { GlobalSearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/aiellie/trace"

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
 * A reply's web search, as a trace line: searching while it runs, then what
 * was searched for and how many pages came back, opening onto them as links.
 */
function WebSearch({
  queries,
  found,
  searching = false,
  className,
}: {
  queries: string[]
  found: Found[]
  /** Whether a search is still running. */
  searching?: boolean
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
              {query ? ` for “${query}”` : ""}
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

export { hostOf, searchesIn, WebSearch }
export type { Found }
