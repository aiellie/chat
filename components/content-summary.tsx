"use client"

import * as React from "react"
import {
  Copy01Icon,
  FileCodeIcon,
  LeftToRightListStarIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import { FileIcon } from "@/components/aiellie/file-attachment"
import { SiteIcon } from "@/components/aiellie/sources"
import { loadMessages } from "@/components/thread-store"
import { pageKey, searchesIn } from "@/components/aiellie/web-search"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

/** A fenced block of code a reply wrote. */
type Snippet = { language: string; code: string }

type ChatFile = { name: string; mediaType: string }

// A fence opens and closes on a line of its own, its language after the
// opening ticks.
const FENCE = /^ {0,3}```([^\n`]*)\n([\s\S]*?)^ {0,3}```/gm
// A link, pasted as it is or the target of a markdown one.
const LINK = /https?:\/\/[^\s<>()[\]"'`]+/g

/**
 * What a chat holds besides its words: the code and files its replies made,
 * the pages they drew on or anyone linked to, and the files sent in.
 */
function summarize(messages: UIMessage[]) {
  const snippets: Snippet[] = []
  const made: ChatFile[] = []
  const sent: ChatFile[] = []
  // Each page once, however its link was written, where it first turned up.
  const pages = new Map<string, string>()
  const seenFiles = new Set<string>()

  const addPage = (url: string) => {
    const key = pageKey(url)
    if (!pages.has(key)) pages.set(key, url)
  }
  const addFile = (list: ChatFile[], file: ChatFile) => {
    const key = `${list === sent ? "sent" : "made"}:${file.name}:${file.mediaType}`
    if (seenFiles.has(key)) return
    seenFiles.add(key)
    list.push(file)
  }

  for (const message of messages) {
    const mine = message.role === "user"
    const text = message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n")
    for (const part of message.parts)
      if (part.type === "file")
        addFile(mine ? sent : made, {
          name: part.filename ?? "File",
          mediaType: part.mediaType,
        })
    if (!mine) {
      for (const page of searchesIn(message).found) addPage(page.url)
      for (const [, language, code] of text.matchAll(FENCE))
        snippets.push({
          language: language.trim().split(/\s+/)[0] || "text",
          code: code.replace(/\n$/, ""),
        })
    }
    // Links in code are the code's business, not pages the chat points to.
    const prose = text.replace(FENCE, "").replace(/`[^`\n]*`/g, "")
    for (const [url] of prose.matchAll(LINK))
      addPage(url.replace(/[.,;:!?]+$/, ""))
  }

  return { snippets, made, sent, pages: [...pages.values()] }
}

/** A link as it reads, without its scheme, "www." or a trailing slash. */
const addressOf = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

/** What a file is, in a word: its format, or what it holds. */
function kindOf({ name, mediaType }: ChatFile) {
  if (mediaType.startsWith("image/")) return "Image"
  if (mediaType === "application/pdf") return "PDF"
  const dot = name.lastIndexOf(".")
  if (dot > 0) return name.slice(dot + 1).toUpperCase()
  if (mediaType.startsWith("text/")) return "Text"
  return "File"
}

const row =
  "flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground outline-none [&_svg]:size-4 [&_svg]:shrink-0"
const hoverable =
  "transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:bg-foreground/[0.06] focus-visible:text-foreground motion-reduce:transition-none dark:hover:bg-foreground/[0.09] dark:focus-visible:bg-foreground/[0.09]"

function RowText({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground/70">
        {detail}
      </span>
    </span>
  )
}

function ContentSection({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  /** Said in place of the list while there's nothing in it. */
  empty: string
  children: React.ReactNode
}) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <h3
        id={id}
        className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-xs text-muted-foreground/70"
      >
        {title}
        {count > 0 ? <span className="tabular-nums">{count}</span> : null}
      </h3>
      {count > 0 ? (
        <ul className="flex flex-col">{children}</ul>
      ) : (
        <p className="px-2 pb-1.5 text-xs text-muted-foreground/70">{empty}</p>
      )}
    </section>
  )
}

/** Copies a snippet, and shows a tick for a moment once it has. */
function CopySnippet({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <TooltipIconButton
      tooltip={copied ? "Copied" : "Copy"}
      onClick={() =>
        navigator.clipboard
          .writeText(code)
          .then(() => setCopied(true))
          .catch(() => {})
      }
      className="size-6 shrink-0"
    >
      <HugeiconsIcon aria-hidden icon={copied ? Tick02Icon : Copy01Icon} />
    </TooltipIconButton>
  )
}

// Mounted only while the popover is open, so each opening reads the chat as
// it was last saved: once its latest reply settled.
function ContentSummaryList({ chatId }: { chatId: string }) {
  const [{ snippets, made, sent, pages }] = React.useState(() =>
    summarize(loadMessages(chatId) ?? [])
  )

  return (
    <>
      <ContentSection
        title="Output"
        count={snippets.length + made.length}
        empty="No code or files from replies yet."
      >
        {snippets.map((snippet, index) => {
          const lines = snippet.code.split("\n")
          const first = lines.find((line) => line.trim()) ?? ""
          return (
            <li key={`code-${index}`} className={`${row} pe-1`}>
              <HugeiconsIcon aria-hidden icon={FileCodeIcon} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-mono text-xs text-foreground">
                  {first.trim() || "(empty)"}
                </span>
                <span className="truncate text-xs text-muted-foreground/70">
                  {snippet.language} · {lines.length}{" "}
                  {lines.length === 1 ? "line" : "lines"}
                </span>
              </span>
              <CopySnippet code={snippet.code} />
            </li>
          )
        })}
        {made.map((file, index) => (
          <li key={`made-${index}`} className={row}>
            <FileIcon name={file.name} mediaType={file.mediaType} />
            <RowText title={file.name} detail={kindOf(file)} />
          </li>
        ))}
      </ContentSection>
      <ContentSection
        title="Sources"
        count={pages.length}
        empty="No pages or links yet."
      >
        {/* The site's icon and the link, one line each, the whole link on
            hover where it's cut short. */}
        {pages.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title={url}
              className={`${row} ${hoverable}`}
            >
              <SiteIcon url={url} />
              <span className="min-w-0 flex-1 truncate">{addressOf(url)}</span>
            </a>
          </li>
        ))}
      </ContentSection>
      <ContentSection
        title="Files"
        count={sent.length}
        empty="No files sent yet."
      >
        {sent.map((file, index) => (
          <li key={`sent-${index}`} className={row}>
            <FileIcon name={file.name} mediaType={file.mediaType} />
            <RowText title={file.name} detail={kindOf(file)} />
          </li>
        ))}
      </ContentSection>
    </>
  )
}

/**
 * The chat header's look at what a chat holds: the code and files its replies
 * made, the pages it drew on and linked to, and the files sent into it.
 */
function ContentSummary({ chatId }: { chatId: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <TooltipIconButton
            tooltip="In this chat"
            className="size-7 data-popup-open:bg-accent data-popup-open:[&_svg]:text-foreground"
          />
        }
      >
        <HugeiconsIcon icon={LeftToRightListStarIcon} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[min(30rem,var(--available-height))] w-80 gap-0 overflow-y-auto overscroll-contain p-1.5"
      >
        <PopoverTitle className="px-2 pt-1 text-sm">In this chat</PopoverTitle>
        <ContentSummaryList chatId={chatId} />
      </PopoverContent>
    </Popover>
  )
}

export { ContentSummary }
