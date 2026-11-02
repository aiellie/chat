"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  defaultComponents,
  Streamdown,
  useIsCodeFenceIncomplete,
  type ExtraProps,
} from "streamdown"
import "streamdown/styles.css"

import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/aiellie/code-block"
import { InlineCitation } from "@/components/aiellie/inline-citation"
import { useWordReveal } from "@/components/aiellie/stream-text"
import { hostOf, pageKey } from "@/components/aiellie/web-search"

function MarkdownCodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}) {
  // True while the closing fence has not arrived yet.
  const incomplete = useIsCodeFenceIncomplete()
  const lines = useHighlightedCode(code, language)

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{language || "text"}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} disabled={incomplete} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

function MarkdownCode({
  node,
  className,
  children,
  ...props
}: React.ComponentProps<"code"> & ExtraProps) {
  // Streamdown marks fenced code with data-block. Inline code stays inline.
  if (!("data-block" in props)) {
    return (
      <code
        className={cn(
          "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]",
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <MarkdownCodeBlock
      code={typeof children === "string" ? children : ""}
      language={/language-(\S+)/.exec(className ?? "")?.[1] ?? ""}
    />
  )
}

/** A page the text may cite, with what its citation's card shows. */
type Citation = { url: string; title?: string; description?: string }

const NO_CITATIONS: Citation[] = []
// Read by each link, so Streamdown's components can stay the same while the
// pages change.
const CitationsContext = React.createContext(NO_CITATIONS)

// The text inside a parsed element, through the spans Streamdown puts its
// words in as they're written.
function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const { value, children } = node as { value?: unknown; children?: unknown }
  if (typeof value === "string") return value
  return Array.isArray(children) ? children.map(textOf).join("") : ""
}

const Link = defaultComponents.a

/**
 * A link, or a citation where the model wrote one: a number for its text,
 * like [1](https://…), as the chat route asks for, or the site's name, as
 * OpenAI writes them. One to a page the text may cite takes that page's
 * number and card.
 */
function MarkdownLink({
  node,
  href = "",
  children,
  ...props
}: React.ComponentProps<"a"> & ExtraProps) {
  const citations = React.useContext(CitationsContext)
  const label = textOf(node).trim()
  const at = citations.findIndex((page) => pageKey(page.url) === pageKey(href))
  const page = at === -1 ? undefined : citations[at]
  const number = /^\[?(\d{1,3})\]?$/.exec(label)?.[1]

  if (number === undefined && !(page && [hostOf(href), href].includes(label)))
    return (
      <Link node={node} href={href} {...props}>
        {children}
      </Link>
    )

  return (
    <InlineCitation
      href={href}
      index={page ? at + 1 : Number(number)}
      title={page?.title}
      description={page?.description}
    />
  )
}

// Streamdown memoizes on components, so keep the default stable.
const DEFAULT_COMPONENTS = { a: MarkdownLink, code: MarkdownCode }

// Each word with the whitespace before it, so joining a prefix of them gives
// the text up to that word, newlines and all.
const WORDS = /\s*\S+/g

// The fade StreamText gives a word, played by Streamdown on the words it
// hasn't drawn before: `sd-liveIn` in globals.css, which lands it in the live
// ink and settles it into the text's own. The pace is the word clock's, so it
// adds no stagger.
const FADE = {
  animation: "liveIn",
  duration: 600,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  stagger: 0,
} as const

/**
 * Markdown, drawn by Streamdown with this app's code blocks. Given
 * `streaming` or `revealInitial`, it writes the text out word by word at
 * StreamText's pace instead of showing it at once, with StreamText's caret
 * after the last word; Streamdown closes what the words so far leave open,
 * like a `**` or a code fence. Links the model wrote as citations show as
 * numbered citations, previewing the page on hover.
 */
function Markdown({
  children,
  streaming = false,
  revealInitial = false,
  pace = 16,
  onRevealed,
  citations = NO_CITATIONS,
  className,
  components = DEFAULT_COMPONENTS,
  controls = false,
  ...props
}: Omit<
  React.ComponentProps<typeof Streamdown>,
  "onAnimationStart" | "onAnimationEnd"
> & {
  /** Whether more of the text is still on its way. */
  streaming?: boolean
  /** Write out the text it mounts with too, instead of showing it at once. */
  revealInitial?: boolean
  /** Words a second, until the stream's own rate is known. */
  pace?: number
  /** Called once the text is finished and every word of it is on screen. */
  onRevealed?: () => void
  /** The pages the text may cite, numbered from 1 in this order. */
  citations?: Citation[]
}) {
  const text = typeof children === "string" ? children : ""
  // Settled for its life: text that started out arriving keeps its pace to
  // the last word, and switching mode once it finishes would redraw it.
  const [paced] = React.useState(streaming || revealInitial)

  const words = React.useMemo(
    () => (paced ? (text.match(WORDS) ?? []) : []),
    [paced, text]
  )
  // While more is coming, a last word with nothing after it may be half a word.
  const ready = streaming && /\S$/.test(text) ? words.length - 1 : words.length
  const { shown } = useWordReveal(text, ready, {
    streaming,
    pace,
    revealInitial,
  })
  const visible = Math.min(shown, words.length)
  const busy = paced && (streaming || visible < words.length)

  return (
    <CitationsContext.Provider value={citations}>
      {/* The caret is drawn from `data-streaming` in globals.css, where
          Streamdown leaves it off after a code block. */}
      <Streamdown
        data-slot="markdown"
        data-streaming={busy || undefined}
        mode={paced ? "streaming" : "static"}
        isAnimating={busy}
        // Streamdown's end of animating is the last word landing.
        onAnimationEnd={onRevealed}
        animated={paced ? FADE : undefined}
        components={components}
        controls={controls}
        className={cn("w-full min-w-0 overflow-hidden", className)}
        {...props}
      >
        {paced ? words.slice(0, visible).join("") : children}
      </Streamdown>
    </CitationsContext.Provider>
  )
}

export { Markdown }
export type { Citation }
