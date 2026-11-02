"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowUp02Icon,
  AudioWave01Icon,
  Cancel01Icon,
  ComputerScreenShareIcon,
  FileUploadIcon,
  FolderUploadIcon,
  Mic01Icon,
  PlusSignIcon,
  StopIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { EmojiSelector } from "@/components/aiellie/emoji-selector"
import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
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
  /** The box <ComposerInput> renders, once it has. */
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  /** Puts text where the caret is, or over what's selected, and the caret after it. */
  insert: (text: string) => void
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
  const input = React.useRef<HTMLTextAreaElement>(null)
  // Where the caret goes once inserted text is in the box. Setting the value
  // puts it at the end, so it's moved back after that render.
  const caret = React.useRef<number | null>(null)

  const setValue = (next: string) => {
    if (!controlled) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  const submit = () => {
    if (!canSubmit || busy) return
    onSubmit(value.trim())
    setValue("")
  }

  // A box that's lost focus still knows where its caret was, so this works
  // from a popover too.
  const insert = (text: string) => {
    const start = input.current?.selectionStart ?? value.length
    const end = input.current?.selectionEnd ?? value.length
    caret.current = start + text.length
    setValue(value.slice(0, start) + text + value.slice(end))
  }

  React.useLayoutEffect(() => {
    if (caret.current === null) return
    input.current?.setSelectionRange(caret.current, caret.current)
    caret.current = null
  }, [value])

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
        inputRef: input,
        insert,
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
          "flex w-full flex-col gap-1 rounded-xl border border-input bg-background p-2 transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:shadow-sm data-dragging:border-dashed data-dragging:border-ring motion-reduce:transition-none dark:bg-input/30",
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
  ref,
  className,
  onKeyDown,
  placeholder = "Ask anything",
  ...props
}: Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "defaultValue" | "onChange"
>) {
  const { value, setValue, submit, disabled, inputRef } = useComposer()

  return (
    <Textarea
      data-slot="composer-input"
      // The composer keeps the box too, to insert at its caret.
      ref={(node) => {
        inputRef.current = node
        if (typeof ref === "function") return ref(node)
        if (ref) ref.current = node
      }}
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
  voice = false,
  onVoiceChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type" | "children"> & {
  /** Whether a voice chat is going. */
  voice?: boolean
  /**
   * Starts or ends a voice chat. With it, the button does that while there's
   * nothing to send, rather than sitting disabled; typing turns it back into
   * send, and the voice chat carries on.
   */
  onVoiceChange?: (voice: boolean) => void
}) {
  const { busy, canSubmit, stop, disabled } = useComposer()

  if (!busy && !canSubmit && onVoiceChange) {
    const label = voice ? "End voice chat" : "Start voice chat"
    return (
      <TooltipIconButton
        data-slot="composer-voice"
        variant="default"
        size="icon-sm"
        type="button"
        tooltip={label}
        side="top"
        aria-pressed={voice}
        disabled={disabled}
        onClick={() => onVoiceChange(!voice)}
        // Drawn as send is, since it stands in its place.
        className={cn(
          "size-7 rounded-full p-0 [&_svg]:text-primary-foreground hover:[&_svg]:text-primary-foreground",
          className
        )}
        {...props}
      >
        <HugeiconsIcon
          aria-hidden
          icon={voice ? Cancel01Icon : AudioWave01Icon}
          strokeWidth={2}
        />
      </TooltipIconButton>
    )
  }

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

/**
 * An option for the next message that stays on until turned off, such as
 * searching the web. Off it's a round icon; on, a filled pill that says what
 * it is, so it's plain the option is in force.
 */
function ComposerToggle({
  pressed,
  onPressedChange,
  icon,
  label,
  tooltip,
  side = "top",
  className,
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  /** Shown beside the icon while it's on. */
  label: string
  tooltip: string
  side?: TooltipIconButtonProps["side"]
  className?: string
}) {
  const { disabled } = useComposer()

  return (
    <TooltipIconButton
      data-slot="composer-toggle"
      type="button"
      tooltip={pressed ? `${tooltip}: on` : tooltip}
      side={side}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "h-7 shrink-0 rounded-full p-1.5",
        pressed
          ? "w-auto gap-1 bg-accent px-2.5 text-xs font-medium text-foreground hover:bg-accent [&_svg]:text-foreground"
          : "size-7",
        className
      )}
    >
      <HugeiconsIcon aria-hidden icon={icon} />
      {pressed ? <span aria-hidden>{label}</span> : null}
    </TooltipIconButton>
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
              "[&>svg]:transition-transform [&>svg]:duration-150 [&>svg]:ease-[cubic-bezier(0.16,1,0.3,1)] aria-expanded:[&>svg]:rotate-45 motion-reduce:[&>svg]:transition-none",
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

// The emoji go where the caret was, and focus goes back to the box after a
// pick, so typing carries on from there.
function ComposerEmoji(
  props: Omit<
    React.ComponentProps<typeof EmojiSelector>,
    "onEmojiSelect" | "returnFocus" | "disabled"
  >
) {
  const { insert, inputRef, disabled } = useComposer()

  return (
    <EmojiSelector
      onEmojiSelect={insert}
      returnFocus={inputRef}
      disabled={disabled}
      {...props}
    />
  )
}

// TypeScript's DOM types have speech results but not the recognizer itself.
type SpeechRecognizer = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult:
    | ((event: {
        resultIndex: number
        results: SpeechRecognitionResultList
      }) => void)
    | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  /** Chrome listens to the track it's given; other browsers ignore it. */
  start(track?: MediaStreamTrack): void
  stop(): void
  abort(): void
}

function speechRecognizer() {
  if (typeof window === "undefined") return undefined
  const speech = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognizer
    webkitSpeechRecognition?: new () => SpeechRecognizer
  }
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition
}

const neverChanges = () => () => {}

/** Dictated words after the text, with a space between unless there is one. */
function withWords(text: string, words: string) {
  const said = words.trimStart()
  if (!said) return text
  return !text || /\s$/.test(text) ? text + said : `${text} ${said}`
}

const BARS = 28

/** Draws each level as a bar centred on the canvas, oldest on the left. */
function drawLevels(canvas: HTMLCanvasElement, levels: number[]) {
  const context = canvas.getContext("2d")
  if (!context) return
  const ratio = window.devicePixelRatio || 1
  const { width, height } = canvas.getBoundingClientRect()
  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = getComputedStyle(canvas).color
  const step = width / levels.length
  levels.forEach((level, index) => {
    const bar = Math.max(2, level * height)
    context.beginPath()
    context.roundRect(index * step, (height - bar) / 2, step * 0.6, bar, 1)
    context.fill()
  })
}

/** What a microphone hears, as bars that scroll left. Flat until it has one. */
function Waveform({
  stream,
  bars = BARS,
  className,
}: {
  stream?: MediaStream
  bars?: number
  className?: string
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const element = canvas.current
    if (!element) return
    const levels = new Array<number>(bars).fill(0)
    drawLevels(element, levels)
    if (!stream) return
    const audio = new AudioContext()
    const analyser = audio.createAnalyser()
    analyser.fftSize = 512
    audio.createMediaStreamSource(stream).connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    let drawnAt = 0
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick)
      // A new bar about every 60ms scrolls at a pace speech can be read in.
      if (time - drawnAt < 60) return
      drawnAt = time
      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) sum += ((sample - 128) / 128) ** 2
      // Speech rarely passes a fifth of full scale, so it's scaled up.
      levels.shift()
      levels.push(Math.min(1, Math.sqrt(sum / samples.length) * 5))
      drawLevels(element, levels)
    }
    let frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      audio.close()
    }
  }, [stream, bars])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={cn("text-foreground", className)}
    />
  )
}

// While dictating: what the microphone hears, and how long it has listened.
function DictationLevel({ stream }: { stream: MediaStream }) {
  const [seconds, setSeconds] = React.useState(0)

  React.useEffect(() => {
    const timer = setInterval(() => setSeconds((count) => count + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      data-slot="composer-dictation"
      className="flex animate-in items-center gap-2 px-1 duration-150 fade-in-0"
    >
      <Waveform stream={stream} className="h-5 w-24" />
      <span role="timer" className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  )
}

// In the microphone menu: what the chosen one hears, so it can be told apart
// from the rest. It opens the microphone only while the menu is open.
function MicrophoneCheck({ microphone }: { microphone: string }) {
  const [heard, setHeard] = React.useState<{
    microphone: string
    stream: MediaStream
  }>()

  React.useEffect(() => {
    let closed = false
    let media: MediaStream | undefined
    navigator.mediaDevices
      .getUserMedia({ audio: microphone ? { deviceId: microphone } : true })
      .then((stream) => {
        media = stream
        if (closed) return stream.getTracks().forEach((track) => track.stop())
        setHeard({ microphone, stream })
      })
      .catch(() => {})
    return () => {
      closed = true
      media?.getTracks().forEach((track) => track.stop())
    }
  }, [microphone])

  return (
    <div
      data-slot="composer-microphone-check"
      className="flex items-center gap-2 px-2 py-1.5"
    >
      <HugeiconsIcon
        aria-hidden
        icon={Mic01Icon}
        strokeWidth={2}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <Waveform
        stream={heard?.microphone === microphone ? heard.stream : undefined}
        bars={40}
        className="h-4 min-w-0 flex-1"
      />
    </div>
  )
}

const MICROPHONE_KEY = "aiellie:microphone"

/** The microphone picked last time, or "" for the system's. A voice chat uses it too. */
function savedMicrophone() {
  try {
    return localStorage.getItem(MICROPHONE_KEY) ?? ""
  } catch {
    return ""
  }
}

/** The microphones there are, leaving out the browser's own aliases. */
async function microphones() {
  const list = async () =>
    (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) =>
        device.kind === "audioinput" &&
        device.deviceId !== "" &&
        device.deviceId !== "default" &&
        device.deviceId !== "communications"
    )
  const found = await list()
  if (found.length > 0) return found
  // Until the microphone is allowed, the browser won't say which ones there are.
  const media = await navigator.mediaDevices.getUserMedia({ audio: true })
  media.getTracks().forEach((track) => track.stop())
  return list()
}

// Speech is written into the box as it's heard, after what's already there.
// It's the browser's own recognition, which Firefox doesn't have, so the
// buttons aren't there at all. The arrow beside the mic picks the microphone,
// which Chrome listens to; Safari takes the waveform from it but hears the
// system's.
function ComposerDictate({
  className,
  side = "top",
  ...props
}: Omit<TooltipIconButtonProps, "tooltip" | "onClick" | "children">) {
  const { value, setValue, busy, disabled } = useComposer()
  const supported = React.useSyncExternalStore(
    neverChanges,
    () => speechRecognizer() !== undefined,
    () => false
  )
  const [listening, setListening] = React.useState(false)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const [blocked, setBlocked] = React.useState(false)
  const [microphone, setMicrophone] = React.useState(savedMicrophone)
  const [found, setFound] = React.useState<MediaDeviceInfo[]>([])
  const recognizer = React.useRef<SpeechRecognizer | null>(null)
  // Read when listening starts, which can be from a restart after a change.
  const chosen = React.useRef(microphone)
  const restart = React.useRef(false)
  // Results can arrive faster than renders, so each builds on the text the
  // last one wrote rather than the text this render saw.
  const box = React.useRef({ value, setValue })
  React.useEffect(() => {
    box.current = { value, setValue }
  })

  // Sending stops it, so what's said next doesn't start the next message.
  React.useEffect(() => {
    if (busy) recognizer.current?.stop()
  }, [busy])
  React.useEffect(() => () => recognizer.current?.abort(), [])

  const start = async () => {
    const Recognizer = speechRecognizer()
    if (!Recognizer) return
    setListening(true)
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({
        // Asked for, not insisted on, so an unplugged one falls back.
        audio: chosen.current ? { deviceId: chosen.current } : true,
      })
    } catch {
      setBlocked(true)
      setListening(false)
      return
    }
    const recognition = new Recognizer()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language
    // Words still being made out sit at the end of the box until they settle.
    let guess = ""
    recognition.onresult = (event) => {
      let heard = ""
      let unsure = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) heard += result[0].transcript
        else unsure += result[0].transcript
      }
      const { value: text, setValue: write } = box.current
      // Typing after the guess keeps it, as typed text.
      const kept =
        guess && text.endsWith(guess) ? text.slice(0, -guess.length) : text
      const settled = withWords(kept, heard)
      const next = withWords(settled, unsure)
      guess = next.slice(settled.length)
      box.current = { value: next, setValue: write }
      write(next)
    }
    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      )
        setBlocked(true)
    }
    recognition.onend = () => {
      media.getTracks().forEach((track) => track.stop())
      recognizer.current = null
      setStream(null)
      setListening(false)
      if (restart.current) {
        restart.current = false
        start()
      }
    }
    recognizer.current = recognition
    recognition.start(media.getAudioTracks()[0])
    setBlocked(false)
    setStream(media)
  }

  const choose = (id: string) => {
    setMicrophone(id)
    chosen.current = id
    try {
      localStorage.setItem(MICROPHONE_KEY, id)
    } catch {
      // Blocked storage only means it's asked for again next visit.
    }
    // A change while listening carries on with the new one.
    if (recognizer.current) {
      restart.current = true
      recognizer.current.stop()
    }
  }

  if (!supported) return null

  return (
    <>
      {stream ? <DictationLevel stream={stream} /> : null}
      <div
        data-slot="composer-dictate"
        role="group"
        aria-label="Dictation"
        className={cn(
          "flex shrink-0 items-center rounded-full transition-colors",
          listening && "bg-live/4"
        )}
      >
        <TooltipIconButton
          type="button"
          side={side}
          tooltip={
            listening
              ? "Stop dictating"
              : blocked
                ? "Allow the microphone to dictate"
                : "Dictate"
          }
          aria-pressed={listening}
          disabled={disabled}
          onClick={() => (listening ? recognizer.current?.stop() : start())}
          className={cn(
            "size-7 shrink-0 rounded-full p-1.5",
            listening &&
              "hover:bg-live/7 [&_svg]:text-live hover:[&_svg]:text-live",
            className
          )}
          {...props}
        >
          <HugeiconsIcon
            aria-hidden
            icon={listening ? StopIcon : Mic01Icon}
            strokeWidth={2}
          />
        </TooltipIconButton>
        <Menu
          onOpenChange={(open) => {
            if (open) microphones().then(setFound, () => setFound([]))
          }}
        >
          <MenuTrigger
            disabled={disabled}
            render={
              <TooltipIconButton
                type="button"
                tooltip="Choose microphone"
                side={side}
                className={cn(
                  "-ms-1 h-7 w-4 shrink-0 rounded-full p-0 data-popup-open:bg-accent [&_svg]:size-3! data-popup-open:[&_svg]:text-foreground",
                  listening &&
                    "hover:bg-live/7 [&_svg]:text-live hover:[&_svg]:text-live"
                )}
              />
            }
          >
            <HugeiconsIcon aria-hidden icon={ArrowDown01Icon} strokeWidth={2} />
          </MenuTrigger>
          <MenuContent side={side} align="end" className="min-w-56">
            <MenuGroup>
              <MenuGroupLabel>Microphone</MenuGroupLabel>
              <MenuRadioGroup value={microphone} onValueChange={choose}>
                <MenuRadioItem value="">System default</MenuRadioItem>
                {found.map((device, index) => (
                  <MenuRadioItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
            <MenuSeparator />
            <MicrophoneCheck microphone={microphone} />
          </MenuContent>
        </Menu>
      </div>
    </>
  )
}

export {
  Composer,
  ComposerAddFiles,
  ComposerAddFolder,
  ComposerAddMenu,
  ComposerAddScreenshot,
  ComposerDictate,
  ComposerEmoji,
  ComposerFooter,
  ComposerHeader,
  ComposerInput,
  ComposerSubmit,
  ComposerToggle,
  savedMicrophone,
  useComposer,
}
export type { ComposerStatus }
