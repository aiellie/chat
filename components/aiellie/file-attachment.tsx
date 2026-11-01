"use client"

import {
  Cancel01Icon,
  Csv01Icon,
  File01Icon,
  FileCodeIcon,
  Image01Icon,
  Pdf01Icon,
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
} from "@/components/aiellie/attachment"

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

/** The icon for a file, by what it holds. */
function iconFor(name: string, mediaType: string) {
  if (mediaType.startsWith("image/")) return Image01Icon
  if (mediaType === "application/pdf") return Pdf01Icon
  if (/\.csv$/i.test(name) || mediaType === "text/csv") return Csv01Icon
  if (CODE.test(name)) return FileCodeIcon
  if (mediaType.startsWith("text/")) return Txt01Icon
  return File01Icon
}

/** One file, named by its path when it came from a folder. */
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
  /** The file's URL, used to work out its size. */
  src?: string
  onRemove?: () => void
}) {
  const slash = name.lastIndexOf("/")
  const title = name.slice(slash + 1)
  const folder = slash === -1 ? undefined : name.slice(0, slash)
  const bytes = size ?? (src ? sizeOfDataUrl(src) : undefined)

  return (
    <Attachment size="xs" title={name}>
      <AttachmentMedia>
        <HugeiconsIcon aria-hidden icon={iconFor(name, mediaType)} />
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
  )
}

export { FileAttachment }
