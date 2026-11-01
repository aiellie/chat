"use client"

import * as React from "react"
import {
  ArrowUp02Icon,
  ComputerScreenShareIcon,
  FileUploadIcon,
  FolderUploadIcon,
  PlusSignIcon,
  StopIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu"
import { Textarea } from "@/components/ui/textarea"
import {
  TooltipIconButton,
  type TooltipIconButtonProps,
} from "@/components/ui/tooltip-icon-button"
import { cn } from "@/lib/utils"

// Named like the AI SDK's `useChat` status, so that value can be handed in.
type ComposerStatus = "ready" | "submitted" | "streaming" | "error"

type ComposerContextValue = {
  value: string
  setValue: (value: string) => void
  busy: boolean
  disabled: boolean
  canSubmit: boolean
  submit: () => void
  stop?: () => void
  /** The composer's `onFilesAdd`. The pickers below are missing without it. */
  addFiles?: (files: File[]) => void
  pickFiles?: () => void
  pickFolder?: () => void
}

const ComposerContext = React.createContext<ComposerContextValue | null>(null)

function useComposer() {
  const context = React.useContext(ComposerContext)
  if (!context) {
    throw new Error("Composer parts must be used inside <Composer>.")
  }
  return context
}

function Composer({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onStop,
  status = "ready",
  disabled = false,
  hasAttachments = false,
  onFilesAdd,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit" | "defaultValue"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called with the trimmed text, which is empty only when `hasAttachments` is set. */
  onSubmit: (value: string) => void
  onStop?: () => void
  status?: ComposerStatus
  disabled?: boolean
  /** Lets a message with no text be sent, because files go with it. */
  hasAttachments?: boolean
  /** Called with files dropped or pasted onto the box. Without it, neither is caught. */
  onFilesAdd?: (files: File[]) => void
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : uncontrolledValue
  const busy = status === "submitted" || status === "streaming"
  const canSubmit = !disabled && (value.trim() !== "" || hasAttachments)
  const [dragging, setDragging] = React.useState(false)
  // Enter and leave fire for every child the pointer crosses, so the box
  // counts them rather than trusting the last one.
  const dragDepth = React.useRef(0)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const folderInput = React.useRef<HTMLInputElement>(null)

  const setValue = (next: string) => {
    if (!controlled) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  const submit = () => {
    if (!canSubmit || busy) return
    onSubmit(value.trim())
    setValue("")
  }

  const carriesFiles = (event: React.DragEvent) =>
    onFilesAdd !== undefined && event.dataTransfer.types.includes("Files")

  return (
    <ComposerContext.Provider
      value={{
        value,
        setValue,
        busy,
        disabled,
        canSubmit,
        submit,
        stop: onStop,
        addFiles: onFilesAdd,
        pickFiles: onFilesAdd ? () => fileInput.current?.click() : undefined,
        pickFolder: onFilesAdd ? () => folderInput.current?.click() : undefined,
      }}
    >
      <form
        data-slot="composer"
        data-status={status}
        data-dragging={dragging || undefined}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        onDragEnter={(event) => {
          onDragEnter?.(event)
          if (!carriesFiles(event)) return
          event.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragOver={(event) => {
          onDragOver?.(event)
          if (carriesFiles(event)) event.preventDefault()
        }}
        onDragLeave={(event) => {
          onDragLeave?.(event)
          if (!carriesFiles(event)) return
          dragDepth.current -= 1
          if (dragDepth.current <= 0) setDragging(false)
        }}
        onDrop={(event) => {
          onDrop?.(event)
          if (!carriesFiles(event)) return
          event.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          // A dropped folder arrives as an empty file that can't be read.
          const files = Array.from(event.dataTransfer.items).flatMap((item) => {
            if (item.kind !== "file" || item.webkitGetAsEntry()?.isDirectory)
              return []
            const file = item.getAsFile()
            return file ? [file] : []
          })
          if (files.length > 0) onFilesAdd?.(files)
        }}
        onPaste={(event) => {
          onPaste?.(event)
          const files = Array.from(event.clipboardData.files)
          // Some apps put a picture of copied text beside it; the text wins.
          if (
            !onFilesAdd ||
            files.length === 0 ||
            event.clipboardData.getData("text/plain")
          )
            return
          event.preventDefault()
          onFilesAdd(files)
        }}
        className={cn(
          "flex w-full flex-col gap-1 rounded-xl border border-input bg-background p-2 shadow-md transition-colors has-[textarea:focus-visible]:border-ring/60 data-dragging:border-dashed data-dragging:border-ring motion-reduce:transition-none dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
        {onFilesAdd ? (
          // These live here rather than in a menu, which unmounts once it closes.
          <>
            <FilePicker ref={fileInput} onFilesAdd={onFilesAdd} />
            <FilePicker ref={folderInput} onFilesAdd={onFilesAdd} folder />
          </>
        ) : null}
      </form>
    </ComposerContext.Provider>
  )
}

function FilePicker({
  ref,
  folder = false,
  onFilesAdd,
}: {
  ref: React.Ref<HTMLInputElement>
  /** Picks a whole folder, whose files arrive with their paths inside it. */
  folder?: boolean
  onFilesAdd: (files: File[]) => void
}) {
  return (
    <input
      ref={ref}
      type="file"
      multiple
      hidden
      tabIndex={-1}
      // Not in React's types, though every current browser supports it.
      {...(folder ? { webkitdirectory: "" } : {})}
      onChange={(event) => {
        const files = Array.from(event.target.files ?? [])
        // Cleared so picking the same files again still fires.
        event.target.value = ""
        if (files.length > 0) onFilesAdd(files)
      }}
    />
  )
}

// An Enter pressed while an input method is composing belongs to the
// character, not the message.
function ComposerInput({
  className,
  onKeyDown,
  placeholder = "Ask anything",
  ...props
}: Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "defaultValue" | "onChange"
>) {
  const { value, setValue, submit, disabled } = useComposer()

  return (
    <Textarea
      data-slot="composer-input"
      rows={1}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault()
          submit()
        }
      }}
      className={cn(
        "max-h-48 min-h-10 resize-none border-0 bg-transparent px-2 py-1.5 focus-visible:border-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

// A tray that sits on top of the box, so it goes just before <Composer>, not
// inside it. Inset past the box's corner, so it meets the straight edge.
// It stays mounted while closed, so it can fold away rather than vanish.
function ComposerHeader({
  open = true,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean
}) {
  // Closed, it keeps what it last showed, so it folds away with its contents
  // instead of emptying first and then closing on nothing.
  const [shown, setShown] = React.useState(children)
  if (open && shown !== children) setShown(children)

  return (
    <div
      data-slot="composer-header"
      data-open={open || undefined}
      inert={!open}
      className="mx-5 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none data-open:grid-rows-[1fr] data-open:opacity-100"
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain rounded-t-xl bg-muted/60 px-1.5 py-1",
            className
          )}
          {...props}
        >
          {open ? children : shown}
        </div>
      </div>
    </div>
  )
}

function ComposerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-footer"
      className={cn("flex items-center justify-end gap-1", className)}
      {...props}
    />
  )
}

function ComposerSubmit({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type" | "children">) {
  const { busy, canSubmit, stop } = useComposer()

  return (
    <Button
      data-slot="composer-submit"
      size="icon-sm"
      type={busy ? "button" : "submit"}
      onClick={
        busy
          ? (event) => {
              // Stopping turns this back into send before the click ends, and send's click
              // would submit the form.
              event.preventDefault()
              stop?.()
            }
          : undefined
      }
      disabled={busy ? !stop : !canSubmit}
      className={cn("rounded-full", className)}
      {...props}
    >
      <HugeiconsIcon icon={busy ? StopIcon : ArrowUp02Icon} strokeWidth={2} />
      <span className="sr-only">{busy ? "Stop" : "Send"}</span>
    </Button>
  )
}

// The plus button whose menu holds ways to add to the message. The rows are
// the caller's, e.g. <ComposerAddFiles />.
function ComposerAddMenu({
  tooltip = "Add",
  side = "top",
  align = "start",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof MenuTrigger>, "render" | "children"> & {
  tooltip?: string
  /** Where both the menu and the tooltip open. */
  side?: TooltipIconButtonProps["side"]
  align?: React.ComponentProps<typeof MenuContent>["align"]
  children: React.ReactNode
}) {
  const { disabled } = useComposer()

  return (
    <Menu>
      <MenuTrigger
        data-slot="composer-add-menu"
        disabled={disabled}
        render={
          <TooltipIconButton
            type="button"
            tooltip={tooltip}
            side={side}
            className={cn(
              "size-7 shrink-0 rounded-full p-1.5 data-popup-open:bg-accent data-popup-open:[&_svg]:text-foreground",
              "[&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-out aria-expanded:[&>svg]:rotate-45 motion-reduce:[&>svg]:transition-none",
              className
            )}
          />
        }
        {...props}
      >
        <HugeiconsIcon aria-hidden icon={PlusSignIcon} strokeWidth={2} />
      </MenuTrigger>
      <MenuContent side={side} align={align}>
        {children}
      </MenuContent>
    </Menu>
  )
}

// The rows below are disabled until the composer is given `onFilesAdd`, which
// what they pick goes to.

function ComposerAddFiles({
  children = "Upload files",
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "onClick">) {
  const { pickFiles } = useComposer()

  return (
    <MenuItem
      data-slot="composer-add-files"
      disabled={!pickFiles}
      onClick={() => pickFiles?.()}
      {...props}
    >
      <HugeiconsIcon aria-hidden icon={FileUploadIcon} />
      {children}
    </MenuItem>
  )
}

function ComposerAddFolder({
  children = "Upload folder",
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "onClick">) {
  const { pickFolder } = useComposer()

  return (
    <MenuItem
      data-slot="composer-add-folder"
      disabled={!pickFolder}
      onClick={() => pickFolder?.()}
      {...props}
    >
      <HugeiconsIcon aria-hidden icon={FolderUploadIcon} />
      {children}
    </MenuItem>
  )
}

// The browser asks which screen, window or tab to share, and one frame of it
// is kept as a PNG. Phones can't share their screen, so it's disabled there.
async function captureScreen() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  })
  try {
    const video = document.createElement("video")
    video.muted = true
    video.srcObject = stream
    await video.play()
    // The first frame can be blank until the stream has painted once.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    // Models scale pictures down to about this anyway, and a full retina
    // screen would make a request too big to send.
    const scale = Math.min(
      1,
      2000 / Math.max(video.videoWidth, video.videoHeight)
    )
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!blob) throw new Error("The screenshot couldn't be encoded.")
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
    return new File([blob], `Screenshot ${stamp}.png`, { type: "image/png" })
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}

function ComposerAddScreenshot({
  children = "Take screenshot",
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "onClick">) {
  const { addFiles } = useComposer()
  // Menu rows only render once the menu opens, so this never runs on the server.
  const supported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"

  return (
    <MenuItem
      data-slot="composer-add-screenshot"
      disabled={!addFiles || !supported}
      onClick={() => {
        if (!addFiles) return
        captureScreen().then(
          (file) => addFiles([file]),
          // Closing the share prompt lands here, and that isn't a failure.
          () => {}
        )
      }}
      {...props}
    >
      <HugeiconsIcon aria-hidden icon={ComputerScreenShareIcon} />
      {children}
    </MenuItem>
  )
}

export {
  Composer,
  ComposerAddFiles,
  ComposerAddFolder,
  ComposerAddMenu,
  ComposerAddScreenshot,
  ComposerFooter,
  ComposerHeader,
  ComposerInput,
  ComposerSubmit,
  useComposer,
}
export type { ComposerStatus }
