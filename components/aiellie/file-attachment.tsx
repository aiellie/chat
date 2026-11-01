"use client"

import { Cancel01Icon, File01Icon, Pdf01Icon } from "@hugeicons/core-free-icons"
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

function kindOf(mediaType: string) {
  if (mediaType.startsWith("image/")) return "Image"
  if (mediaType === "application/pdf") return "PDF"
  return "Text"
}

/** One file, named by its path when it came from a folder. */
function FileAttachment({
  name,
  mediaType,
  src,
  onRemove,
}: {
  name: string
  mediaType: string
  /** Shown as a thumbnail when the file is a picture. */
  src?: string
  onRemove?: () => void
}) {
  const slash = name.lastIndexOf("/")
  const title = name.slice(slash + 1)
  const folder = slash === -1 ? undefined : name.slice(0, slash)
  const thumbnail = mediaType.startsWith("image/") && src ? src : undefined

  return (
    <Attachment size="xs" title={name}>
      <AttachmentMedia variant={thumbnail ? "image" : "icon"}>
        {thumbnail ? (
          // A blob or data URL, which next/image has nothing to optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" />
        ) : (
          <HugeiconsIcon
            aria-hidden
            icon={mediaType === "application/pdf" ? Pdf01Icon : File01Icon}
          />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{title}</AttachmentTitle>
        <AttachmentDescription>
          {folder ?? kindOf(mediaType)}
        </AttachmentDescription>
      </AttachmentContent>
      {onRemove ? (
        <AttachmentActions>
          <AttachmentAction aria-label={`Remove ${title}`} onClick={onRemove}>
            <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
          </AttachmentAction>
        </AttachmentActions>
      ) : null}
    </Attachment>
  )
}

export { FileAttachment }
