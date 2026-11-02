"use client"

import * as React from "react"
import {
  Calendar03Icon,
  Delete02Icon,
  Download01Icon,
  File01Icon,
  HardDriveIcon,
  Image01Icon,
  Link01Icon,
  LinkSquare02Icon,
  MoreHorizontalIcon,
  Note01Icon,
  PencilEdit02Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  createStashItem,
  deleteStashItem,
  updateStashItem,
  type StashInput,
  type StashItem,
} from "@/components/stash-store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DetailList, DetailRow } from "@/components/ui/detail-list"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { Textarea } from "@/components/ui/textarea"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { cn } from "@/lib/utils"

/** What an item is, as its tile and row show it. An image is a file. */
type Look = "file" | "image" | "page" | "link" | "code"

const LOOKS: Record<
  Look,
  { label: string; icon: IconSvgElement; tile: string }
> = {
  file: {
    label: "File",
    icon: File01Icon,
    tile: "bg-muted text-foreground",
  },
  image: {
    label: "Image",
    icon: Image01Icon,
    tile: "bg-pink-50 text-pink-500 dark:bg-pink-500/15 dark:text-pink-400",
  },
  page: {
    label: "Page",
    icon: Note01Icon,
    tile: "bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400",
  },
  link: {
    label: "Link",
    icon: Link01Icon,
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
  },
  code: {
    label: "Code",
    icon: SourceCodeIcon,
    tile: "bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-400",
  },
}

const lookOf = (item: StashItem): Look =>
  item.kind === "file"
    ? item.mediaType?.startsWith("image/")
      ? "image"
      : "file"
    : item.kind

const day = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function bytes(size = 0) {
  const units = ["B", "KB", "MB", "GB"]
  let value = size
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString("en", { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`
}

// "PNG" from image/png, or the file's own extension.
function typeOf(item: StashItem) {
  const subtype = item.mediaType?.split("/")[1]?.split(/[+.;-]/)[0]
  const extension = item.name.includes(".")
    ? item.name.split(".").pop()
    : undefined
  return (extension || subtype || "file").toUpperCase()
}

function hostOf(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** The line under an item's name: what's in it, in a few words. */
function summaryOf(item: StashItem) {
  switch (item.kind) {
    case "file":
      return `${typeOf(item)} · ${bytes(item.size)}`
    case "link":
      // The whole address, as the name is often just its site.
      return (item.url ?? "")
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\/$/, "")
    case "code":
      return item.language ?? "Code"
    case "page":
      return (
        item.body
          ?.split("\n")
          .map((line) => line.replace(/^[#>*\-\s]+/, "").trim())
          .find(Boolean) ?? "Empty page"
      )
  }
}

/**
 * A blob's address for as long as it's shown, let go after. Set once the
 * effect has run, so an effect run twice in development lets go of the
 * first and shows the second.
 */
function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = React.useState<string>()
  React.useEffect(() => {
    if (!blob) return
    let current = true
    const next = URL.createObjectURL(blob)
    Promise.resolve().then(() => {
      if (current) setUrl(next)
    })
    return () => {
      current = false
      URL.revokeObjectURL(next)
    }
  }, [blob])
  return blob ? url : undefined
}

/** Saves a stashed file to the person's computer, by its own name. */
function download(item: StashItem) {
  if (!item.blob) return
  const url = URL.createObjectURL(item.blob)
  const link = document.createElement("a")
  link.href = url
  link.download = item.name
  link.click()
  // Long enough for the browser to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** An item's tile: an image shows itself; the rest, their kind's mark. */
function StashTile({ item }: { item: StashItem }) {
  const look = lookOf(item)
  const src = useObjectUrl(look === "image" ? item.blob : undefined)
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a local blob, which next/image can't load
      <img
        src={src}
        alt=""
        className="size-9 shrink-0 rounded-lg border border-border/60 object-cover"
      />
    )
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        LOOKS[look].tile
      )}
    >
      <HugeiconsIcon aria-hidden icon={LOOKS[look].icon} className="size-5" />
    </span>
  )
}

const field = "flex flex-col gap-2"
const label = "text-sm font-medium"

// Mounted only while the dialog is open, so it starts from the item, or
// empty for a new one.
function EditorForm({
  kind,
  item,
  onDone,
}: {
  kind: StashInput["kind"]
  item?: StashItem
  onDone: () => void
}) {
  const [name, setName] = React.useState(item?.name ?? "")
  const [body, setBody] = React.useState(item?.body ?? "")
  const [language, setLanguage] = React.useState(item?.language ?? "")
  const [url, setUrl] = React.useState(item?.url ?? "")
  const [saving, setSaving] = React.useState(false)
  const id = React.useId()

  // A link is named by its site if the person leaves the name empty.
  const ready = kind === "link" ? URL.canParse(url.trim()) : name.trim() !== ""
  const noun = LOOKS[kind].label.toLowerCase()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!ready || saving) return
        setSaving(true)
        const input: StashInput = {
          kind,
          name: name.trim() || hostOf(url.trim()),
          body,
          language,
          url,
        }
        if (item) await updateStashItem(item.id, input)
        else await createStashItem(input)
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {item
            ? `Edit ${noun}`
            : kind === "code"
              ? "New snippet"
              : `New ${noun}`}
        </DialogTitle>
        <DialogDescription>Saved in this browser.</DialogDescription>
      </DialogHeader>
      {kind === "link" ? (
        <div className={field}>
          <label htmlFor={`${id}-url`} className={label}>
            URL
          </label>
          <Input
            id={`${id}-url`}
            type="url"
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </div>
      ) : null}
      <div className={field}>
        <label htmlFor={`${id}-name`} className={label}>
          {kind === "link" ? (
            <>
              Name{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </>
          ) : (
            "Name"
          )}
        </label>
        <Input
          id={`${id}-name`}
          autoFocus={kind !== "link"}
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={
            kind === "page"
              ? "Launch notes"
              : kind === "code"
                ? "Debounce hook"
                : hostOf(url) || "Its site"
          }
        />
      </div>
      {kind === "code" ? (
        <div className={field}>
          <label htmlFor={`${id}-language`} className={label}>
            Language{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <Input
            id={`${id}-language`}
            autoComplete="off"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="tsx"
            className="font-mono"
          />
        </div>
      ) : null}
      {kind !== "link" ? (
        <div className={field}>
          <label htmlFor={`${id}-body`} className={label}>
            {kind === "code" ? "Code" : "Page"}
          </label>
          <Textarea
            id={`${id}-body`}
            rows={10}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={kind === "code" ? "" : "Write in Markdown"}
            spellCheck={kind !== "code"}
            className={cn(
              "max-h-[50vh]",
              kind === "code" && "font-mono text-xs"
            )}
          />
        </div>
      ) : null}
      <DialogFooter>
        {item?.kind === "link" && item.url ? (
          <Button
            variant="ghost"
            className="sm:me-auto"
            nativeButton={false}
            render={<a href={item.url} target="_blank" rel="noreferrer" />}
          >
            <HugeiconsIcon aria-hidden icon={LinkSquare02Icon} />
            Open link
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready || saving}>
          {item ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Writes a new page, link or snippet, or edits one when given it. */
function StashEditor({
  open,
  onOpenChange,
  kind,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: StashInput["kind"]
  item?: StashItem
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <EditorForm
            kind={kind}
            item={item}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** A file's details: the image itself if it's one, then what it is. */
function FileDialog({
  item,
  open,
  onOpenChange,
}: {
  item: StashItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const src = useObjectUrl(open ? item.blob : undefined)
  const image = lookOf(item) === "image"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pe-6">{item.name}</DialogTitle>
          <DialogDescription>{summaryOf(item)}</DialogDescription>
        </DialogHeader>
        {image && src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob, which next/image can't load
          <img
            src={src}
            alt={item.name}
            className="max-h-72 w-full rounded-lg border border-border/60 bg-muted object-contain"
          />
        ) : null}
        <DetailList title="Details">
          <DetailRow
            icon={image ? Image01Icon : File01Icon}
            label="Type"
            value={item.mediaType ?? typeOf(item)}
            className="font-mono"
          />
          <DetailRow
            icon={HardDriveIcon}
            label="Size"
            value={bytes(item.size)}
          />
          <DetailRow
            icon={Calendar03Icon}
            label="Added"
            value={day.format(item.createdAt)}
          />
        </DetailList>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => download(item)}>
            <HugeiconsIcon aria-hidden icon={Download01Icon} />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** What opening an item shows: a file's details, or the editor. */
function StashItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: StashItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return item.kind === "file" ? (
    <FileDialog item={item} open={open} onOpenChange={onOpenChange} />
  ) : (
    <StashEditor
      open={open}
      onOpenChange={onOpenChange}
      kind={item.kind}
      item={item}
    />
  )
}

/**
 * An item's more button, on its row: open it, open a link where it goes,
 * download a file, or delete it once the person confirms.
 */
function StashActions({
  item,
  onOpen,
}: {
  item: StashItem
  onOpen: () => void
}) {
  const [deleting, setDeleting] = React.useState(false)

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <TooltipIconButton
              tooltip="More"
              side="left"
              // Shows as the row is hovered, and always on touch, where
              // nothing hovers. It stays while focused or its menu is open.
              className="opacity-0 transition-[opacity,scale] group-focus-within/item:opacity-100 group-hover/item:opacity-100 data-popup-open:bg-muted data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
            />
          }
        >
          <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
        </MenuTrigger>
        <MenuContent side="bottom" align="end">
          <MenuItem onClick={onOpen}>
            <HugeiconsIcon
              aria-hidden
              icon={item.kind === "file" ? File01Icon : PencilEdit02Icon}
            />
            {item.kind === "file" ? "Details" : "Edit"}
          </MenuItem>
          {item.kind === "link" && item.url ? (
            <MenuLinkItem href={item.url} target="_blank" rel="noreferrer">
              <HugeiconsIcon aria-hidden icon={LinkSquare02Icon} />
              Open link
            </MenuLinkItem>
          ) : null}
          {item.kind === "file" ? (
            <MenuItem onClick={() => download(item)}>
              <HugeiconsIcon aria-hidden icon={Download01Icon} />
              Download
            </MenuItem>
          ) : null}
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <HugeiconsIcon aria-hidden icon={Delete02Icon} />
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{item.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;s removed from this browser for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={async () => {
                await deleteStashItem(item.id)
                setDeleting(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export {
  LOOKS,
  StashActions,
  StashEditor,
  StashItemDialog,
  StashTile,
  summaryOf,
}
