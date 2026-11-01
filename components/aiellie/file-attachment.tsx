"use client"

import * as React from "react"
import {
  Cancel01Icon,
  Copy01Icon,
  Csv01Icon,
  Delete02Icon,
  Download04Icon,
  File01Icon,
  FileCodeIcon,
  Image01Icon,
  Tick02Icon,
  Txt01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/aiellie/attachment"
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockLine,
} from "@/components/aiellie/code-block"
import { codeIcons, type CodeIconName } from "@/components/icons"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"

const UNITS = ["B", "KB", "MB", "GB"]

/** A byte count as people read it: 512 B, 1.2 MB, 34 KB. */
function formatSize(bytes: number) {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

/** The size of what a base64 data URL holds, without decoding it. */
function sizeOfDataUrl(url: string) {
  const comma = url.indexOf(",")
  if (!url.startsWith("data:") || comma === -1) return undefined
  if (!url.slice(0, comma).endsWith(";base64")) return url.length - comma - 1
  const data = url.slice(comma + 1)
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0
  return (data.length * 3) / 4 - padding
}

// Text files are all sent as text/plain, so code is told apart by extension.
const CODE =
  /\.(c|cc|cpp|cs|css|go|h|hpp|html?|java|jsx?|json|kt|lua|mjs|php|py|rb|rs|scss|sh|sql|svelte|swift|toml|tsx?|vue|xml|ya?ml|zsh)$/i

// Extensions whose language or format has its own mark. JSX is React, the
// same mark as TSX.
const MARKS: Record<string, CodeIconName> = {
  bash: "bash",
  cjs: "js",
  css: "css",
  cts: "ts",
  go: "go",
  ico: "ico",
  js: "js",
  json: "json",
  jsx: "tsx",
  md: "md",
  mdx: "md",
  mjs: "js",
  mts: "ts",
  pdf: "pdf",
  py: "python",
  rs: "rust",
  sh: "bash",
  svg: "svg",
  ts: "ts",
  tsx: "tsx",
  zsh: "bash",
}

/** The mark for a file's language or format, when it has one. */
function markFor(name: string, mediaType: string): CodeIconName | undefined {
  const file = name.slice(name.lastIndexOf("/") + 1).toLowerCase()
  if (file === ".gitignore") return "gitignore"
  if (file === ".env" || file.startsWith(".env.")) return "env"
  if (mediaType === "application/pdf") return "pdf"
  const dot = file.lastIndexOf(".")
  return dot > 0 ? MARKS[file.slice(dot + 1)] : undefined
}

/** The icon for a file, by what it holds. */
function iconFor(name: string, mediaType: string) {
  if (mediaType.startsWith("image/")) return Image01Icon
  if (/\.csv$/i.test(name) || mediaType === "text/csv") return Csv01Icon
  if (CODE.test(name)) return FileCodeIcon
  if (mediaType.startsWith("text/")) return Txt01Icon
  return File01Icon
}

/** A file's mark, or the icon for what it holds when it has none. */
function FileIcon({ name, mediaType }: { name: string; mediaType: string }) {
  const mark = markFor(name, mediaType)
  const Mark = mark ? codeIcons[mark] : undefined
  if (Mark) return <Mark />
  return <HugeiconsIcon aria-hidden icon={iconFor(name, mediaType)} />
}

/** A URL an <img> can draw the file from, when it's a picture. */
function pictureOf(name: string, mediaType: string, src?: string) {
  if (!src) return undefined
  if (mediaType.startsWith("image/")) return src
  // SVGs are sent as plain text so the model reads their source; a sent one
  // needs its own type back to be drawn.
  if (/\.svg$/i.test(name))
    return src.replace(/^data:text\/plain/, "data:image/svg+xml")
  return undefined
}

/** The text at a file's URL, once it has loaded. */
function useText(src: string | undefined) {
  const [loaded, setLoaded] = React.useState<{ src: string; text: string }>()

  React.useEffect(() => {
    if (!src) return
    let cancelled = false
    fetch(src)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) setLoaded({ src, text })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [src])

  return loaded && loaded.src === src ? loaded.text : undefined
}

/** A blob URL for a file, which a frame opens where a data URL may not. */
function useBlobUrl(src: string | undefined) {
  const [made, setMade] = React.useState<{ src: string; url: string }>()

  React.useEffect(() => {
    if (!src || src.startsWith("blob:")) return
    let cancelled = false
    let url: string | undefined
    fetch(src)
      .then((response) => response.blob())
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setMade({ src, url })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [src])

  if (src?.startsWith("blob:")) return src
  return made && made.src === src ? made.url : undefined
}

// Clipboards take pictures as PNG, so other formats are redrawn as one.
async function pngOf(src: string) {
  const blob = await fetch(src).then((response) => response.blob())
  if (blob.type === "image/png") return blob
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
  return canvas.convertToBlob({ type: "image/png" })
}

/** A text file's lines, highlighted by its extension when it's code. */
function TextPreview({ text, name }: { text: string; name: string }) {
  const lines = useHighlightedCode(text, name.slice(name.lastIndexOf(".") + 1))

  return (
    <CodeBlock size="sm" className="max-h-[60vh]">
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

/** The file as it would be opened: a picture, a document or its text. */
function FilePreview({
  name,
  mediaType,
  src,
  picture,
  text,
}: {
  name: string
  mediaType: string
  src?: string
  picture?: string
  text?: string
}) {
  const pdf = mediaType === "application/pdf"
  const document = useBlobUrl(pdf ? src : undefined)

  if (picture)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt={name}
        className="mx-auto max-h-[60vh] max-w-full rounded-lg object-contain"
      />
    )
  if (document)
    return (
      <iframe
        src={document}
        title={name}
        className="h-[60vh] w-full rounded-lg border"
      />
    )
  if (text !== undefined) return <TextPreview text={text} name={name} />
  if (src && (pdf || mediaType.startsWith("text/")))
    return <Skeleton className="h-40 w-full" />
  return <p className="text-muted-foreground">This file can’t be previewed.</p>
}

/** Copies a text file's text, or a picture as a picture. */
function CopyButton({
  text,
  src,
  disabled,
}: {
  text?: string
  src: string
  disabled?: boolean
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={() => {
        const copying =
          text === undefined
            ? navigator.clipboard.write([
                new ClipboardItem({ "image/png": pngOf(src) }),
              ])
            : navigator.clipboard.writeText(text)
        copying.then(() => setCopied(true)).catch(() => {})
      }}
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        data-icon="inline-start"
      />
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

/**
 * What a file opens to: a look at it, and what can be done with it. Mounted
 * only while it's open, so nothing is read until then.
 */
function FileDialogBody({
  name,
  mediaType,
  src,
  picture,
  bytes,
  onRemove,
}: {
  name: string
  mediaType: string
  src?: string
  picture?: string
  bytes?: number
  onRemove?: () => void
}) {
  const slash = name.lastIndexOf("/")
  const title = name.slice(slash + 1)
  const folder = slash === -1 ? undefined : name.slice(0, slash)
  const textual = mediaType.startsWith("text/")
  const text = useText(textual ? src : undefined)
  const details = [folder, bytes === undefined ? null : formatSize(bytes)]

  return (
    <>
      <DialogHeader className="min-w-0 pe-8">
        <DialogTitle className="truncate leading-normal">{title}</DialogTitle>
        <DialogDescription className="truncate">
          {details.filter(Boolean).join(" · ")}
        </DialogDescription>
      </DialogHeader>
      <FilePreview
        name={title}
        mediaType={mediaType}
        src={src}
        picture={picture}
        text={text}
      />
      <DialogFooter>
        {onRemove ? (
          // Closes too: the composer's header keeps the last file it showed
          // while it folds away, and the dialog with it.
          <DialogClose
            render={<Button variant="destructive" className="sm:me-auto" />}
            onClick={onRemove}
          >
            <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
            Remove
          </DialogClose>
        ) : null}
        {src && (textual || mediaType.startsWith("image/")) ? (
          <CopyButton
            text={text}
            src={src}
            disabled={textual && text === undefined}
          />
        ) : null}
        {src ? (
          <a href={src} download={title} className={buttonVariants()}>
            <HugeiconsIcon icon={Download04Icon} data-icon="inline-start" />
            Download
          </a>
        ) : null}
      </DialogFooter>
    </>
  )
}

/** One file, named by its path when it came from a folder. Opens to a look at
 * it, with ways to copy, download or remove it. */
function FileAttachment({
  name,
  mediaType,
  size,
  src,
  onRemove,
}: {
  name: string
  mediaType: string
  /** In bytes. Read from `src` when it's a data URL and this is left out. */
  size?: number
  /** Shown as a thumbnail when the file is a picture, and opened to preview,
   * copy or download it. */
  src?: string
  onRemove?: () => void
}) {
  const slash = name.lastIndexOf("/")
  const title = name.slice(slash + 1)
  const folder = slash === -1 ? undefined : name.slice(0, slash)
  const bytes = size ?? (src ? sizeOfDataUrl(src) : undefined)
  const thumbnail = pictureOf(name, mediaType, src)

  return (
    <Dialog>
      <Attachment size="xs" title={name}>
        <DialogTrigger
          render={<AttachmentTrigger aria-label={`Open ${title}`} />}
        />
        <AttachmentMedia variant={thumbnail ? "image" : "icon"}>
          {thumbnail ? (
            // A blob or data URL, which next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" />
          ) : (
            <FileIcon name={name} mediaType={mediaType} />
          )}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{title}</AttachmentTitle>
          <AttachmentDescription>
            {folder ?? (bytes === undefined ? null : formatSize(bytes))}
          </AttachmentDescription>
        </AttachmentContent>
        {onRemove ? (
          <AttachmentActions>
            <AttachmentAction
              aria-label={`Remove ${title}`}
              onClick={onRemove}
              className="text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        ) : null}
      </Attachment>
      <DialogContent className="sm:max-w-2xl">
        <FileDialogBody
          name={name}
          mediaType={mediaType}
          src={src}
          picture={thumbnail}
          bytes={bytes}
          onRemove={onRemove}
        />
      </DialogContent>
    </Dialog>
  )
}

export { FileAttachment }
