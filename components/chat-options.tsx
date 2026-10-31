"use client"

import {
  Archive01Icon,
  Delete01Icon,
  GitForkIcon,
  PencilEdit01Icon,
  PinIcon,
  PinOffIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MenuItem, MenuSeparator } from "@/components/ui/menu"

type ChatOptionsProps = {
  pinned?: boolean
  onRename?: () => void
  onTogglePin?: () => void
  onArchive?: () => void
  onShare?: () => void
  onFork?: () => void
  onDelete?: () => void
}

function hasChatOptions(props: ChatOptionsProps) {
  return Boolean(
    props.onRename ||
    props.onTogglePin ||
    props.onArchive ||
    props.onShare ||
    props.onFork ||
    props.onDelete
  )
}

// The same list in the header and on each sidebar row, so a chat offers the
// same things wherever it's opened from. An option without a handler is left
// out.
function ChatOptions({
  pinned = false,
  onRename,
  onTogglePin,
  onArchive,
  onShare,
  onFork,
  onDelete,
}: ChatOptionsProps) {
  return (
    <>
      {onRename ? (
        <MenuItem onClick={onRename}>
          <HugeiconsIcon icon={PencilEdit01Icon} />
          Rename
        </MenuItem>
      ) : null}
      {onTogglePin ? (
        <MenuItem onClick={onTogglePin}>
          <HugeiconsIcon icon={pinned ? PinOffIcon : PinIcon} />
          {pinned ? "Unpin" : "Pin"}
        </MenuItem>
      ) : null}
      {onArchive ? (
        <MenuItem onClick={onArchive}>
          <HugeiconsIcon icon={Archive01Icon} />
          Archive
        </MenuItem>
      ) : null}
      {onShare ? (
        <MenuItem onClick={onShare}>
          <HugeiconsIcon icon={Share08Icon} />
          Share
        </MenuItem>
      ) : null}
      {onFork ? (
        <MenuItem onClick={onFork}>
          <HugeiconsIcon icon={GitForkIcon} />
          Fork
        </MenuItem>
      ) : null}
      {onDelete ? (
        <>
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={onDelete}>
            <HugeiconsIcon icon={Delete01Icon} />
            Delete
          </MenuItem>
        </>
      ) : null}
    </>
  )
}

export { ChatOptions, hasChatOptions }
export type { ChatOptionsProps }
