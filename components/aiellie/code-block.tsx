"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { codeIcons, type CodeIconName } from "@/components/aiellie/icons"
import type { CodeToken } from "@/lib/highlight-code"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Download01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

const ICON_ALIASES: Record<string, CodeIconName> = {
  javascript: "js",
  jsx: "tsx",
  mjs: "js",
  cjs: "js",
  typescript: "ts",
  mts: "ts",
  py: "python",
  rs: "rust",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  markdown: "md",
  mdx: "md",
}

// Takes a file name or a language, so `use-tick.ts` and `typescript` land on
// the same mark.
function codeIconOf(name: string) {
  const base = (name.split("/").pop() ?? name).toLowerCase()
  const key =
    base === ".env" || base.startsWith(".env.")
      ? "env"
      : (base.split(".").pop() ?? base)
  const icon = Object.hasOwn(codeIcons, key)
    ? (key as CodeIconName)
    : ICON_ALIASES[key]
  // Called rather than rendered: the marks are plain drawings with no state.
  return icon ? codeIcons[icon]({}) : null
}

function splitLines(code: string) {
  const lines = code.split("\n")
  // A trailing newline isn't a blank line anybody wrote.
  if (lines.length > 1 && lines.at(-1) === "") lines.pop()
  return lines
}

// Each line's tokens, plain until Shiki has coloured it. A line that changed
// since the last pass stays plain until the next one lands, so streamed code
// keeps its colours rather than flashing.
function useHighlightedLines(code: string, language?: string) {
  const [result, setResult] = React.useState<{
    language: string
    lines: CodeToken[][]
  } | null>(null)

  React.useEffect(() => {
    if (!language) return
    let current = true
    // Loaded on first use, so Shiki stays out of the page until code shows.
    import("@/lib/highlight-code")
      .then(({ highlightTokens }) => highlightTokens(code, language))
      .then((lines) => {
        if (current) setResult({ language, lines })
      })
      .catch(() => {
        // A language Shiki doesn't know stays plain.
      })
    return () => {
      current = false
    }
  }, [code, language])

  return React.useMemo(() => {
    const colored = result && result.language === language ? result.lines : []
    return splitLines(code).map((line, index) => {
      const tokens = colored[index]
      return tokens && tokens.map((token) => token.content).join("") === line
        ? tokens
        : [{ content: line }]
    })
  }, [code, language, result])
}

function CodeTokens({ tokens }: { tokens: CodeToken[] }) {
  return tokens.map((token, index) => (
    <span
      key={index}
      style={token.style}
      className={cn(token.style && "dark:text-(color:--shiki-dark)!")}
    >
      {token.content}
    </span>
  ))
}

function useCopied() {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Refused, so there is nothing to confirm.
    }
  }

  return [copied, copy] as const
}

const codeBlockVariants = cva(
  "group/code-block relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl text-xs has-[>[data-slot=code-block-content]:focus-visible]:border-ring has-[>[data-slot=code-block-content]:focus-visible]:ring-0 data-[size=sm]:text-xs",
  {
    variants: {
      variant: {
        default:
          "border border-input text-foreground has-[>[data-slot=code-block-content]:focus-visible]:border-ring dark:bg-input/30",
        destructive: "border border-destructive/20 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function CodeBlock({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof codeBlockVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-size={size}
      className={cn(codeBlockVariants({ variant }), className)}
      {...props}
    />
  )
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 px-3 pt-3 text-muted-foreground group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:pt-2.5 group-data-[variant=destructive]/code-block:text-destructive *:has-[>[data-slot=code-block-title]]:min-w-0",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockTitle({
  icon,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** A mark of your own, or `null` for none. Left out, a file name's mark is read off a string title. */
  icon?: React.ReactNode
}) {
  // Only a name with an extension gets a mark, so a bare language like "tsx" stays text.
  const mark =
    icon === undefined && typeof children === "string" && children.includes(".")
      ? codeIconOf(children)
      : (icon ?? null)

  return (
    <div
      data-slot="code-block-title"
      className={cn(
        "min-w-0 truncate font-sans text-sm font-medium text-foreground group-data-[size=sm]/code-block:text-xs group-data-[variant=destructive]/code-block:text-destructive [&_svg]:pointer-events-none [&_svg]:inline-block [&_svg]:align-middle [&_svg:not([class*='size-'])]:size-3.5 *:[svg]:me-1.5",
        className
      )}
      {...props}
    >
      {mark}
      {children}
    </div>
  )
}

function CodeBlockActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn(
        "-my-1 ms-auto -me-1.5 flex shrink-0 items-center gap-1 [[data-slot=code-block]>&]:absolute [[data-slot=code-block]>&]:end-2 [[data-slot=code-block]>&]:top-2 [[data-slot=code-block]>&]:z-10 [[data-slot=code-block]>&]:m-0 [[data-slot=code-block]>&]:opacity-0 [[data-slot=code-block]>&]:transition-opacity [[data-slot=code-block]>&]:group-focus-within/code-block:opacity-100 [[data-slot=code-block]>&]:group-hover/code-block:opacity-100 group-data-[size=sm]/code-block:[[data-slot=code-block]>&]:end-1.5 group-data-[size=sm]/code-block:[[data-slot=code-block]>&]:top-1.5 [[data-slot=code-block]>&]:pointer-coarse:opacity-100 [[data-slot=code-block]>&]:*:[button]:bg-background [[data-slot=code-block]>&]:*:[button]:ring-1 [[data-slot=code-block]>&]:*:[button]:ring-foreground/10",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockCopyButton({
  value,
  variant = "ghost",
  size = "icon-xs",
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & { value: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) {
      return
    }

    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <>
      <Button
        data-slot="code-block-copy-button"
        data-copied={copied || undefined}
        variant={variant}
        size={size}
        aria-label={copied ? "Copied" : "Copy"}
        className={cn(className)}
        onClick={(event) => {
          onClick?.(event)
          navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => {})
        }}
        {...props}
      >
        {copied ? (
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        ) : (
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  )
}

function CodeBlockCopy({
  code,
  tooltip = "Copy",
  ...props
}: Omit<React.ComponentProps<typeof TooltipIconButton>, "tooltip"> & {
  code: string
  tooltip?: string
}) {
  const [copied, copy] = useCopied()

  return (
    <TooltipIconButton
      data-slot="code-block-copy"
      tooltip={copied ? "Copied" : tooltip}
      onClick={() => copy(code)}
      {...props}
    >
      <HugeiconsIcon aria-hidden icon={copied ? Tick02Icon : Copy01Icon} />
    </TooltipIconButton>
  )
}

function CodeBlockDownload({
  code,
  filename = "snippet.txt",
  tooltip = "Download",
  ...props
}: Omit<React.ComponentProps<typeof TooltipIconButton>, "tooltip"> & {
  code: string
  filename?: string
  tooltip?: string
}) {
  return (
    <TooltipIconButton
      data-slot="code-block-download"
      tooltip={tooltip}
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([code], { type: "text/plain;charset=utf-8" })
        )
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        link.click()
        // Revoked a tick later, or some browsers cancel before reading it.
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }}
      {...props}
    >
      <HugeiconsIcon aria-hidden icon={Download01Icon} />
    </TooltipIconButton>
  )
}

type CodeBlockContentProps = React.ComponentProps<"pre"> & {
  /** Wraps long lines instead of scrolling them. */
  wrap?: boolean
  lineNumbers?: boolean
  startLine?: number
}

type HighlightedContentProps = Omit<CodeBlockContentProps, "children"> & {
  /** The code to show. Given this, the block colours it itself with Shiki. */
  code: string
  /** Any language Shiki knows, like `tsx` or `bash`. Left out, the code stays plain. */
  language?: string
  /** Lines to mark, counting from 1. */
  highlightLines?: number[]
  /** Shows a caret after the last line while more code is coming. */
  streaming?: boolean
}

function CodeBlockContent(
  props: CodeBlockContentProps | HighlightedContentProps
) {
  if ("code" in props && typeof props.code === "string") {
    return <HighlightedContent {...props} />
  }

  const {
    className,
    children,
    style,
    wrap = false,
    lineNumbers = false,
    startLine = 1,
    ...rest
  } = props as CodeBlockContentProps

  return (
    <pre
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      data-numbered={lineNumbers || undefined}
      dir="ltr"
      tabIndex={0}
      style={{ counterReset: `line ${startLine - 1}`, ...style }}
      className={cn(
        "min-h-0 min-w-0 scroll-fade-x scrollbar-thin overflow-auto px-3 py-3 text-start font-mono leading-relaxed outline-none group-has-data-[slot=code-block-footer]/code-block:pb-2 group-has-data-[slot=code-block-header]/code-block:pt-2 group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:py-2.5 group-data-[size=sm]/code-block:group-has-data-[slot=code-block-header]/code-block:pt-1.5 data-wrap:scroll-fade-y data-wrap:wrap-break-word data-wrap:whitespace-pre-wrap",
        className
      )}
      {...rest}
    >
      <code
        data-slot="code-block-code"
        className="grid min-h-lh min-w-max content-start in-data-numbered:grid-cols-[auto_1fr] in-data-wrap:min-w-0"
      >
        {lineNumbers && typeof children === "string"
          ? children
              .replace(/\n$/, "")
              .split("\n")
              .map((line, index) => (
                <CodeBlockLine key={index}>{line}</CodeBlockLine>
              ))
          : children}
      </code>
    </pre>
  )
}

const codeBlockLineVariants = cva(
  "relative -mx-3 block min-h-lh px-3 group-data-[size=sm]/code-block:-mx-2.5 group-data-[size=sm]/code-block:px-2.5 before:min-w-6 before:text-end before:text-muted-foreground after:absolute after:start-1 after:top-0 after:text-muted-foreground after:select-none in-data-numbered:col-span-2 in-data-numbered:grid in-data-numbered:grid-cols-subgrid in-data-numbered:gap-x-3 in-data-numbered:[counter-increment:line] in-data-numbered:before:content-[counter(line)] in-data-numbered:before:select-none in-data-numbered:supports-[content:counter(line)_/_'']:before:content-[counter(line)_/_'']",
  {
    variants: {
      variant: {
        default: "",
        added: "bg-muted after:content-['+']",
        removed: "bg-destructive/4 after:text-destructive after:content-['−']",
        highlighted: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function CodeBlockLine({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof codeBlockLineVariants>) {
  // An empty line holds a newline so copying a selection keeps blank lines.
  const empty =
    children === undefined ||
    children === null ||
    children === "" ||
    (Array.isArray(children) && children.length === 0)

  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn(codeBlockLineVariants({ variant }), className)}
      {...props}
    >
      <span data-slot="code-block-line-content" className="min-w-0">
        {empty ? "\n" : children}
      </span>
    </span>
  )
}

function HighlightedContent({
  code,
  language,
  lineNumbers = false,
  highlightLines,
  wrap = false,
  streaming = false,
  startLine = 1,
  className,
  ...props
}: HighlightedContentProps) {
  const lines = useHighlightedLines(code, language)
  const marked = new Set(highlightLines)
  const gutter = `${String(lines.length).length}ch`

  return (
    <pre
      data-slot="code-block-content"
      // Code reads left to right whatever the page does, or its brackets
      // reorder under rtl.
      dir="ltr"
      tabIndex={wrap ? undefined : 0}
      aria-busy={streaming || undefined}
      className={cn(
        "min-w-0 overflow-x-auto py-3 font-mono text-[0.8125rem] leading-[1.375rem] outline-none",
        className
      )}
      {...props}
    >
      <code className={cn("grid", !wrap && "w-max min-w-full")}>
        {lines.map((tokens, index) => {
          const number = index + startLine
          const highlighted = marked.has(number)

          return (
            <span
              key={index}
              data-slot="code-block-line"
              data-highlighted={highlighted || undefined}
              className={cn(
                "flex min-h-[1.375rem] bg-background pe-4",
                !lineNumbers && "ps-4",
                highlighted && "bg-muted"
              )}
            >
              {lineNumbers ? (
                <span
                  aria-hidden
                  style={{ minInlineSize: gutter }}
                  className="sticky start-0 box-content shrink-0 bg-inherit ps-4 pe-4 text-end text-[0.6875rem] text-muted-foreground tabular-nums select-none"
                >
                  {number}
                </span>
              ) : null}
              <span
                className={cn(
                  wrap ? "min-w-0 flex-1 whitespace-pre-wrap" : "whitespace-pre"
                )}
              >
                <CodeTokens tokens={tokens} />
                {streaming && index === lines.length - 1 ? (
                  <span
                    aria-hidden
                    data-slot="code-block-caret"
                    className="ms-0.5 inline-block h-3.5 w-0.5 animate-caret-blink bg-live align-middle motion-reduce:animate-none"
                  />
                ) : null}
              </span>
            </span>
          )
        })}
      </code>
    </pre>
  )
}

function CodeBlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 px-3 pb-3 text-muted-foreground group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:pb-2.5",
        className
      )}
      {...props}
    />
  )
}

export {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopy,
  CodeBlockCopyButton,
  CodeBlockDownload,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
  CodeTokens,
  codeIconOf,
  useHighlightedLines,
}
