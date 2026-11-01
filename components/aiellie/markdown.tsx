"use client"

import * as React from "react"
import { cn } from "cn"
import {
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
import { useWordReveal } from "@/components/aiellie/stream-text"

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

// Streamdown memoizes on components, so keep the default stable.
const DEFAULT_COMPONENTS = { code: MarkdownCode }

// Each word with the whitespace before it, so joining a prefix of them gives
// the text up to that word, newlines and all.
const WORDS = /\s*\S+/g

// The fade StreamText gives a word, played by Streamdown on the words it
// hasn't drawn before. The pace is the word clock's, so it adds no stagger.
const FADE = {
  animation: "blurIn",
  duration: 280,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  stagger: 0,
} as const

/**
 * Markdown, drawn by Streamdown with this app's code blocks. Given
 * `streaming` or `revealInitial`, it writes the text out word by word at
 * StreamText's pace instead of showing it at once; Streamdown closes what the
 * words so far leave open, like a `**` or a code fence.
 */
function Markdown({
  children,
  streaming = false,
  revealInitial = false,
  pace = 16,
  className,
  components = DEFAULT_COMPONENTS,
  controls = false,
  ...props
}: React.ComponentProps<typeof Streamdown> & {
  /** Whether more of the text is still on its way. */
  streaming?: boolean
  /** Write out the text it mounts with too, instead of showing it at once. */
  revealInitial?: boolean
  /** Words a second, until the stream's own rate is known. */
  pace?: number
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
    <Streamdown
      data-slot="markdown"
      mode={paced ? "streaming" : "static"}
      isAnimating={busy}
      animated={paced ? FADE : undefined}
      caret={paced ? "block" : undefined}
      components={components}
      controls={controls}
      className={cn("cn-markdown w-full min-w-0 overflow-hidden", className)}
      {...props}
    >
      {paced ? words.slice(0, visible).join("") : children}
    </Streamdown>
  )
}

export { Markdown }
