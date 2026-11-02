"use client"

import * as React from "react"
import { experimental_useRealtime as useRealtime } from "@ai-sdk/react"
import { MicOff01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Warp,
  type PaperShaderElement,
  type WarpProps,
} from "@paper-design/shaders-react"
import {
  experimental_decodeRealtimeAudio as decodeRealtimeAudio,
  gateway,
  type Experimental_RealtimeSessionConfig as RealtimeSessionConfig,
  type UIMessage,
} from "ai"

import { savedMicrophone } from "@/components/aiellie/composer"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { apiKeyHeaders } from "@/lib/api-keys"
import type { MessageMetadata } from "@/lib/model-messages"
import { voiceModelOf } from "@/lib/models"
import { cn } from "@/lib/utils"

// A voice chat runs beside the thread rather than through it: the realtime
// model hears and answers aloud, what's said joins the thread as it's
// finished, and messages typed meanwhile still go to the chat's own model,
// which the voice is told about.

const INSTRUCTIONS = `You are Ellie, talking with the person out loud. Speak naturally and keep replies short, the way people talk: don't read out lists, markdown, links or code. The person can also type in the chat while you talk. Typed messages are answered there in writing, not by you; what you know of them is below.`

const SESSION = {
  // Transcribed, so what the person says joins the thread too.
  inputAudioTranscription: {},
  turnDetection: { type: "server-vad" },
} satisfies Partial<RealtimeSessionConfig>

// The realtime session's default, which its audio arrives at.
const SAMPLE_RATE = 24000

// About the last few thousand words, which is plenty to talk about.
const CONTEXT_CHARS = 16000

/**
 * The thread as plain text, newest last, each line saying whether it was
 * typed or said. Files are named, not described.
 */
function transcriptOf(messages: UIMessage[]) {
  const text = messages
    .flatMap((message) => {
      const said = message.parts
        .flatMap((part) =>
          part.type === "text"
            ? [part.text]
            : part.type === "file"
              ? [`[${part.filename ?? "A file"}]`]
              : []
        )
        .join("\n")
        .trim()
      if (!said) return []
      const spoken = (message.metadata as MessageMetadata | undefined)?.spoken
      const who =
        message.role === "user"
          ? spoken
            ? "The person said"
            : "The person typed"
          : spoken
            ? "You said"
            : "Ellie wrote"
      return [`${who}: ${said}`]
    })
    .join("\n\n")
  return text.length > CONTEXT_CHARS ? `…${text.slice(-CONTEXT_CHARS)}` : text
}

const instructionsWith = (transcript: string) =>
  transcript
    ? `${INSTRUCTIONS}\n\nThe chat outside this conversation of yours, oldest first:\n\n${transcript}`
    : INSTRUCTIONS

// Speech rarely passes a fifth of full scale, so loudness is scaled up.
const GAIN = 5

/** How loud a stretch of samples is, 0 to 1. */
function loudness(sumOfSquares: number, count: number) {
  return Math.min(1, Math.sqrt(sumOfSquares / Math.max(1, count)) * GAIN)
}

/** How loud the microphone is, read as often as the orb is drawn. */
function useMicrophoneLevel(stream: MediaStream) {
  const read = React.useRef<() => number>(() => 0)

  React.useEffect(() => {
    const audio = new AudioContext()
    const analyser = audio.createAnalyser()
    analyser.fftSize = 512
    audio.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    read.current = () => {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) sum += sample ** 2
      return loudness(sum, samples.length)
    }
    return () => {
      read.current = () => 0
      audio.close()
    }
  }, [stream])

  return read
}

const STEP_MS = 50
const STEP_SAMPLES = (SAMPLE_RATE * STEP_MS) / 1000

/**
 * How loud the voice is as it's heard: its audio as a level every 50ms,
 * played out from when it starts. Audio arrives faster than it's spoken and
 * each chunk plays straight after the last, so the levels queue up the same.
 */
function speechLevels() {
  let levels: number[] = []
  let startedAt = 0
  let sum = 0
  let count = 0
  const playing = () =>
    Math.floor((performance.now() - startedAt) / STEP_MS) < levels.length

  return {
    add(base64: string) {
      // Once what came before has played out, playback starts afresh.
      if (!playing()) {
        levels = []
        startedAt = performance.now()
      }
      for (const sample of decodeRealtimeAudio(base64)) {
        sum += sample ** 2
        if (++count < STEP_SAMPLES) continue
        levels.push(loudness(sum, count))
        sum = 0
        count = 0
      }
    },
    level() {
      return levels[Math.floor((performance.now() - startedAt) / STEP_MS)] ?? 0
    },
    clear() {
      levels = []
    },
  }
}

type VoiceState = "connecting" | "listening" | "speaking" | "muted" | "failed"

const LABELS: Record<VoiceState, string> = {
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Speaking",
  muted: "Muted",
  failed: "Voice chat stopped",
}

// The orb's look: a Warp shader swirling three colours past a soft edge.
const WARP = {
  proportion: 0.35,
  softness: 1,
  distortion: 0.32,
  swirl: 1,
  swirlIterations: 0,
  shape: "edge",
  shapeScale: 0,
  scale: 0.31,
  rotation: 176,
  offsetX: 0.65,
  offsetY: 0.09,
  // Drawn as if 240px across and shrunk to fit, so the orb shows the whole
  // swirl rather than a pale corner of it.
  fit: "cover",
  worldWidth: 240,
  worldHeight: 240,
} satisfies WarpProps

// Blue while it's live, and grey while it's muted or has stopped.
const LIVE_COLORS = ["#ade7ff", "#ebf4ff", "#00bbff"]
const QUIET_COLORS = ["#ffffff", "#bfbfbf", "#ffffff"]

// How fast it swirls with a loud voice. It idles at a fraction of this.
const SWIRL_SPEED = 12.2

/** How fast the orb swirls, as a share of its top speed, at this loudness. */
function paceOf(state: VoiceState, level: number) {
  if (state === "listening" || state === "speaking") return 0.15 + level * 0.85
  if (state === "connecting") return 0.1
  if (state === "muted") return 0.04
  return 0
}

/**
 * The orb: it swells and swirls faster with whoever is talking, the person
 * or the voice, and greys out while muted. `level` is read every frame, so
 * it can follow audio without rendering.
 */
function VoiceOrb({
  ref,
  state,
  level,
  className,
  style,
  ...props
}: React.ComponentProps<"button"> & {
  state: VoiceState
  level: () => number
}) {
  const orb = React.useRef<HTMLButtonElement>(null)
  const shader = React.useRef<PaperShaderElement>(null)
  const read = React.useRef({ level, state })
  React.useEffect(() => {
    read.current = { level, state }
  })
  const quiet = state === "muted" || state === "failed"

  // Held still where motion is unwanted: the shader starts at rest, and
  // nothing sets it going.
  React.useEffect(() => {
    const element = orb.current
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return
    let shown = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      // Quick to swell and slow to settle, so it follows speech without
      // flickering between words.
      const target = read.current.level()
      shown += (target - shown) * (target > shown ? 0.35 : 0.1)
      element.style.setProperty("--level", shown.toFixed(3))
      // Only its pace, which doesn't draw a frame of its own.
      shader.current?.paperShaderMount?.setSpeed(
        SWIRL_SPEED * paceOf(read.current.state, shown)
      )
    }
    let frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <button
      // A tooltip trigger it's rendered as needs the button too.
      ref={(node) => {
        orb.current = node
        if (typeof ref === "function") return ref(node)
        if (ref) ref.current = node
      }}
      type="button"
      data-slot="voice-orb"
      data-state={state}
      className={cn(
        "group/orb relative grid size-20 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
        className
      )}
      style={{ "--level": 0, ...style } as React.CSSProperties}
      {...props}
    >
      {/* A halo that grows with the voice, hidden until there is one. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[#00bbff]/35 opacity-80 blur-xl transition-opacity duration-500 group-data-[state=connecting]/orb:opacity-0 group-data-[state=failed]/orb:opacity-0 group-data-[state=muted]/orb:opacity-0"
        style={{ scale: "calc(0.9 + var(--level) * 0.9)" }}
      />
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-opacity duration-500 group-data-[state=connecting]/orb:animate-pulse group-data-[state=failed]/orb:opacity-50"
        style={{ scale: "calc(0.92 + var(--level) * 0.2)" }}
      >
        <Warp
          ref={shader}
          {...WARP}
          colors={quiet ? QUIET_COLORS : LIVE_COLORS}
          speed={0}
          className="absolute inset-0"
        />
      </span>
      {state === "muted" ? (
        <HugeiconsIcon
          aria-hidden
          icon={MicOff01Icon}
          strokeWidth={2}
          className="relative size-6 text-neutral-700"
        />
      ) : null}
    </button>
  )
}

/** Each step's text, joined, as the thread keeps it. */
const textOf = (message: UIMessage) =>
  message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim()

// Once connected: the realtime session itself, the orb, and what's said
// handed to the thread.
function VoiceSession({
  id,
  model,
  stream,
  setup,
  messages,
  busy,
  onMessages,
}: {
  id: string
  model: { id: string; name: string }
  stream: MediaStream
  /** Where the session fetches its setup from, already fetched. */
  setup: string
  messages: UIMessage[]
  busy: boolean
  onMessages: (messages: UIMessage[]) => void
}) {
  // What the voice is told of the thread: everything when it starts, and
  // from then on what's typed, as it says the rest itself.
  const context = React.useMemo(
    () =>
      transcriptOf(
        messages.filter(
          (message) =>
            (message.metadata as MessageMetadata | undefined)?.spoken?.chat !==
            id
        )
      ),
    [messages, id]
  )
  const settings = voiceModelOf(model.id)
  // Both made once, as the hook replaces its session when either changes.
  const [realtimeModel] = React.useState(() =>
    gateway.experimental_realtime(model.id)
  )
  const [sessionConfig] = React.useState(() => ({
    ...SESSION,
    ...(settings?.voice ? { voice: settings.voice } : {}),
    instructions: instructionsWith(context),
  }))
  const told = React.useRef(context)
  const [speech] = React.useState(speechLevels)
  const [error, setError] = React.useState<string>()
  const [muted, setMuted] = React.useState(false)

  const realtime = useRealtime({
    model: realtimeModel,
    api: { token: setup },
    sessionConfig,
    onEvent: (event) => {
      if (event.type === "audio-delta" || event.type === "audio-chunk")
        speech.add(event.delta)
      // The person talking over it stops its audio.
      if (event.type === "speech-started") speech.clear()
    },
    onError: (error) => setError(error.message),
  })
  const {
    status,
    connect,
    startAudioCapture,
    stopAudioCapture,
    sendEvent,
    isPlaying,
  } = realtime
  const microphone = useMicrophoneLevel(stream)

  React.useEffect(() => {
    void connect()
    // The session stops the tracks it's given when it's done with them, so
    // it gets a copy, and the orb goes on hearing the microphone itself.
    startAudioCapture(stream.clone())
  }, [connect, startAudioCapture, stream])

  // Something typed and answered meanwhile is passed on once the reply is in,
  // to a voice that takes it.
  const setOnce = settings?.setOnce
  React.useEffect(() => {
    if (setOnce || busy || status !== "connected" || context === told.current)
      return
    told.current = context
    sendEvent({
      type: "session-update",
      config: { ...sessionConfig, instructions: instructionsWith(context) },
    }).catch(() => {})
  }, [setOnce, busy, context, sendEvent, sessionConfig, status])

  // What's said goes to the thread once it's finished: the person's words
  // when they're transcribed, and a reply when its transcript is done or the
  // talk has moved on past it. When the chat ends, what's unfinished goes
  // too, as far as it got.
  const firstSeen = React.useRef(new Map<string, number>())
  const reported = React.useRef("")
  const report = React.useEffectEvent((all: boolean) => {
    const list = realtime.messages.flatMap((message, index, said) => {
      const finished =
        all ||
        index < said.length - 1 ||
        message.parts.every(
          (part) => part.type !== "text" || part.state === "done"
        )
      const text = textOf(message)
      if (!firstSeen.current.has(message.id))
        firstSeen.current.set(message.id, Date.now())
      if (!finished || !text) return []
      const metadata: MessageMetadata = {
        createdAt: firstSeen.current.get(message.id),
        spoken: { chat: id, model: model.name },
      }
      return [
        {
          id: `voice-${id}-${message.id}`,
          role: message.role,
          parts: [{ type: "text" as const, text }],
          metadata,
        },
      ]
    })
    // Only when it's changed, not for every word of a reply. Some voices
    // transcribe the person bit by bit, so a turn already sent can grow.
    const key = list
      .map((message) => `${message.id}:${textOf(message).length}`)
      .join()
    if (key === reported.current) return
    reported.current = key
    onMessages(list)
  })
  React.useEffect(() => report(false), [realtime.messages])
  React.useEffect(() => () => report(true), [])

  const state: VoiceState =
    status === "error"
      ? "failed"
      : status !== "connected"
        ? "connecting"
        : muted
          ? "muted"
          : isPlaying
            ? "speaking"
            : "listening"

  return (
    <VoiceStage
      state={state}
      label={state === "failed" && error ? error.split("\n")[0] : LABELS[state]}
      level={() =>
        state === "speaking"
          ? speech.level()
          : state === "listening"
            ? microphone.current()
            : 0
      }
      disabled={state === "connecting" || state === "failed"}
      tooltip={muted ? "Unmute microphone" : "Mute microphone"}
      onClick={() => {
        // The microphone goes quiet for the orb too, not only for the voice.
        for (const track of stream.getAudioTracks()) track.enabled = muted
        if (muted) startAudioCapture(stream.clone())
        else stopAudioCapture()
        setMuted(!muted)
      }}
    />
  )
}

// The orb, with what it's doing written under it.
function VoiceStage({
  state,
  label,
  tooltip,
  ...props
}: React.ComponentProps<typeof VoiceOrb> & {
  label: string
  tooltip?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <TooltipProvider>
        <Tooltip disabled={!tooltip || props.disabled}>
          <TooltipTrigger
            render={<VoiceOrb state={state} aria-label={tooltip} {...props} />}
          />
          <TooltipContent side="top">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <p
        aria-live="polite"
        className={cn(
          "max-w-xs text-center text-xs text-muted-foreground",
          state === "failed" && "text-destructive"
        )}
      >
        {label}
      </p>
    </div>
  )
}

/**
 * A voice chat, from when it's started until it's ended by unmounting. It
 * opens the microphone the composer dictates with, then connects. Finished
 * turns go to `onMessages`, every one so far in the order said, each time
 * there's another, marked with the chat's `id`.
 */
function VoiceChat({
  id,
  model,
  messages,
  busy,
  onMessages,
  className,
}: {
  id: string
  /** The realtime model to talk with. */
  model: { id: string; name: string }
  /** The thread, which the voice is told about. */
  messages: UIMessage[]
  /** Whether a typed message's reply is on its way. */
  busy: boolean
  onMessages: (messages: UIMessage[]) => void
  className?: string
}) {
  const [ready, setReady] = React.useState<{
    stream: MediaStream
    setup: string
  }>()
  const [failure, setFailure] = React.useState<string>()

  React.useEffect(() => {
    let live = true
    let media: MediaStream | undefined
    const start = async () => {
      const microphone = savedMicrophone()
      try {
        media = await navigator.mediaDevices.getUserMedia({
          // Asked for, not insisted on, so an unplugged one falls back.
          audio: microphone ? { deviceId: microphone } : true,
        })
      } catch {
        if (live) setFailure("Allow the microphone to talk")
        return
      }
      if (!live) return media.getTracks().forEach((track) => track.stop())
      // Asked for after the microphone, so it doesn't run out while the
      // browser asks to use it. The session would fetch this itself, but
      // without the API keys' headers, so it's handed what came back.
      const response = await fetch("/api/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({ model: model.id }),
      }).catch(() => undefined)
      const body = await response?.json().catch(() => undefined)
      if (!live) return
      if (!response?.ok) {
        // The Gateway's errors go on to say how to fix them, at length.
        setFailure(
          typeof body?.error === "string"
            ? body.error.split("\n")[0]
            : "Voice chat couldn't start"
        )
        return
      }
      setReady({
        stream: media,
        setup: `data:application/json,${encodeURIComponent(JSON.stringify(body))}`,
      })
    }
    start()
    return () => {
      live = false
      media?.getTracks().forEach((track) => track.stop())
    }
  }, [model.id])

  return (
    <div
      data-slot="voice-chat"
      className={cn(
        "animate-in duration-300 fade-in-0 zoom-in-90 motion-reduce:animate-none",
        className
      )}
    >
      {ready ? (
        <VoiceSession
          {...ready}
          id={id}
          model={model}
          messages={messages}
          busy={busy}
          onMessages={onMessages}
        />
      ) : (
        <VoiceStage
          state={failure ? "failed" : "connecting"}
          label={failure ?? LABELS.connecting}
          level={() => 0}
          disabled
        />
      )}
    </div>
  )
}

export { VoiceChat, VoiceOrb }
