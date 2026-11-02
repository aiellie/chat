"use client"

import * as React from "react"
import { experimental_useRealtime as useRealtime } from "@ai-sdk/react"
import {
  experimental_decodeRealtimeAudio as decodeRealtimeAudio,
  gateway,
  type Experimental_RealtimeSessionConfig as RealtimeSessionConfig,
  type UIMessage,
} from "ai"

import { savedMicrophone } from "@/components/aiellie/composer"
import { VoiceStage, type VoiceState } from "@/components/aiellie/voice-orb"
import { apiKeyHeaders } from "@/lib/api-keys"
import type { MessageMetadata } from "@/lib/model-messages"
import { voiceModelOf } from "@/lib/models"

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

const LABELS: Record<VoiceState, string> = {
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Speaking",
  muted: "Muted",
  failed: "Voice chat stopped",
  ended: "Voice chat ended",
}

/** Each step's text, joined, as the thread keeps it. */
const textOf = (message: UIMessage) =>
  message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim()

/** What the orb shows, as the session sees it. */
type Stage = { state: VoiceState; label: string; tooltip?: string }

// Once set up: the realtime session itself, and what's said handed to the
// thread. It draws nothing: the orb is the voice chat's, so it isn't built
// again as the session connects, and the session tells it what to show.
function VoiceSession({
  id,
  model,
  stream,
  setup,
  messages,
  busy,
  ending,
  onMessages,
  onStage,
  levelRef,
  pressRef,
}: {
  id: string
  model: { id: string; name: string }
  stream: MediaStream
  /** Where the session fetches its setup from, already fetched. */
  setup: string
  messages: UIMessage[]
  busy: boolean
  /** The chat has ended: it hangs up at once, or never connects. */
  ending: boolean
  onMessages: (messages: UIMessage[]) => void
  onStage: (stage: Stage) => void
  /** Set to how loud whoever is talking is, read as the orb draws. */
  levelRef: React.RefObject<() => number>
  /** Set to what pressing the orb does. */
  pressRef: React.RefObject<() => void>
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
    disconnect,
    startAudioCapture,
    stopAudioCapture,
    sendEvent,
    isPlaying,
  } = realtime
  const microphone = useMicrophoneLevel(stream)

  React.useEffect(() => {
    if (ending) return
    void connect()
    // The session stops the tracks it's given when it's done with them, so
    // it gets a copy, and the orb goes on hearing the microphone itself.
    startAudioCapture(stream.clone())
  }, [ending, connect, startAudioCapture, stream])

  // Ended while the orb folds away: it hangs up now, not once it's gone.
  React.useEffect(() => {
    if (ending) disconnect()
  }, [ending, disconnect])

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

  const state: VoiceState = ending
    ? "ended"
    : status === "error"
      ? "failed"
      : status !== "connected"
        ? "connecting"
        : muted
          ? "muted"
          : isPlaying
            ? "speaking"
            : "listening"
  const label =
    state === "failed" && error ? error.split("\n")[0] : LABELS[state]
  const tooltip = muted ? "Unmute microphone" : "Mute microphone"
  React.useEffect(() => {
    onStage({ state, label, tooltip })
  }, [state, label, tooltip, onStage])

  React.useEffect(() => {
    levelRef.current = () =>
      state === "speaking"
        ? speech.level()
        : state === "listening"
          ? microphone.current()
          : 0
    pressRef.current = () => {
      // The microphone goes quiet for the orb too, not only for the voice.
      for (const track of stream.getAudioTracks()) track.enabled = muted
      if (muted) startAudioCapture(stream.clone())
      else stopAudioCapture()
      setMuted(!muted)
    }
  })

  return null
}

/**
 * A voice chat, from when it's started until it's unmounted, with its orb.
 * It opens the microphone the composer dictates with, then connects.
 * Finished turns go to `onMessages`, every one so far in the order said,
 * each time there's another, marked with the chat's `id`. Once `ending`,
 * it hangs up and the orb goes quiet, ready to be folded away.
 */
function VoiceChat({
  id,
  model,
  messages,
  busy,
  ending = false,
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
  ending?: boolean
  onMessages: (messages: UIMessage[]) => void
  className?: string
}) {
  const [ready, setReady] = React.useState<{
    stream: MediaStream
    setup: string
  }>()
  const [failure, setFailure] = React.useState<string>()
  const [stage, setStage] = React.useState<Stage>()
  const levelRef = React.useRef<() => number>(() => 0)
  const pressRef = React.useRef<() => void>(() => {})

  // Ended: the microphone is let go now, not once the orb has folded away.
  React.useEffect(() => {
    if (ending) ready?.stream.getTracks().forEach((track) => track.stop())
  }, [ending, ready])

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

  const shown: Stage = ending
    ? { state: "ended", label: LABELS.ended }
    : ready && stage
      ? stage
      : {
          state: failure ? "failed" : "connecting",
          label: failure ?? LABELS.connecting,
        }

  return (
    <div data-slot="voice-chat" className={className}>
      {ready ? (
        <VoiceSession
          {...ready}
          id={id}
          model={model}
          messages={messages}
          busy={busy}
          ending={ending}
          onMessages={onMessages}
          onStage={setStage}
          levelRef={levelRef}
          pressRef={pressRef}
        />
      ) : null}
      <VoiceStage
        {...shown}
        level={() => levelRef.current()}
        disabled={
          shown.state === "connecting" ||
          shown.state === "failed" ||
          shown.state === "ended"
        }
        onClick={() => pressRef.current()}
      />
    </div>
  )
}

export { VoiceChat }
