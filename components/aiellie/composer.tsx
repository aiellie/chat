"use client"

import * as React from "react"
import { ArrowUp02Icon, StopIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
          "flex w-full flex-col gap-1 rounded-xl border border-input bg-background p-2 transition-colors has-[textarea:focus-visible]:border-ring/60 data-dragging:border-dashed data-dragging:border-ring motion-reduce:transition-none dark:bg-input/30 shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </form>
    </ComposerContext.Provider>
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
          {children}
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

export {
  Composer,
  ComposerFooter,
  ComposerHeader,
  ComposerInput,
  ComposerSubmit,
  useComposer,
}
export type { ComposerStatus }