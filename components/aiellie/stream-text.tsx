"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// A word, not a token, is the unit: tokens often stop halfway through a word,
// and letters landing on a word already on screen read as a correction.
interface Word {
  text: string
  /** Inside a pair of backticks. */
  code: boolean
  space: string
  /** Whether the whitespace after it is still inside the backticks. */
  spaceCode: boolean
}

// Running this far behind the stream keeps a few words in hand, so a pause
// slows the writing instead of stopping it dead.
const RESERVE_SECONDS = 0.45
const CATCH_UP_SECONDS = 0.8
const RATE_WINDOW_SECONDS = 1.5
const MIN_RATE = 4
const MAX_RATE = 80

// Older words are joined back into plain text, so a long reply stays a few
// dozen elements. By this distance a word has long finished fading in.
const LIVE_WORDS = 96

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

function pageIsHidden() {
  return document.visibilityState === "hidden"
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function splitWords(text: string, inlineCode: boolean) {
  const words: Word[] = []
  const pattern = inlineCode ? /\s+|`|[^\s`]+/g : /\s+|\S+/g
  let lead = ""
  let code = false

  for (const token of text.match(pattern) ?? []) {
    if (inlineCode && token === "`") {
      code = !code
    } else if (/^\s/.test(token)) {
      const last = words.at(-1)
      if (last) {
        last.space += token
        last.spaceCode = code
      } else {
        lead += token
      }
    } else {
      words.push({ text: token, code, space: "", spaceCode: code })
    }
  }

  return { lead, words }
}

const wordClass = cn(
  "transition-[opacity,filter,color] duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
  "starting:text-live starting:opacity-0 starting:blur-xs"
)

// Cloned across a line break, so code that wraps keeps its padding and corners
// on both lines.
const codeClass =
  "rounded-sm bg-muted box-decoration-clone px-1 py-px font-mono text-[0.93em]"

function renderWords(
  lead: string,
  words: Word[],
  animateFrom: number,
  freshFrom: number
) {
  const nodes: React.ReactNode[] = []
  let chip: React.ReactNode[] | null = null
  let chips = 0
  let run = lead

  const flush = () => {
    if (run) (chip ?? nodes).push(run)
    run = ""
  }

  const setCode = (code: boolean) => {
    if (code === (chip !== null)) return
    flush()
    if (chip) {
      nodes.push(
        <code
          key={`code-${chips++}`}
          data-slot="stream-text-code"
          className={codeClass}
        >
          {chip}
        </code>
      )
      chip = null
    } else {
      chip = []
    }
  }

  words.forEach((word, index) => {
    setCode(word.code)
    if (index < animateFrom) {
      run += word.text
    } else {
      flush()
      ;(chip ?? nodes).push(
        <span
          key={index}
          className={cn(wordClass, index >= freshFrom && "text-live")}
        >
          {word.text}
        </span>
      )
    }
    if (word.space) {
      setCode(word.spaceCode)
      run += word.space
    }
  })

  setCode(false)
  flush()
  return nodes
}

function StreamText({
  text,
  streaming = false,
  pace = 16,
  revealInitial = false,
  inlineCode = true,
  freshWords = 2,
  onRevealed,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** The reply so far. Each value should carry on from the one before. */
  text: string
  /** Whether more is still on its way. */
  streaming?: boolean
  /** Words a second, until the stream's own rate is known, and for `revealInitial`. */
  pace?: number
  /** Write out the text it mounts with too, instead of showing it at once. */
  revealInitial?: boolean
  /** Set runs inside `backticks` as code. */
  inlineCode?: boolean
  /** How many of the newest words hold the live ink while more are coming. */
  freshWords?: number
  /** Called once the reply is finished and every word of it is on screen. */
  onRevealed?: () => void
}) {
  const { lead, words } = React.useMemo(
    () => splitWords(text, inlineCode),
    [text, inlineCode]
  )

  // While more is coming, a last word with nothing after it may be half a word.
  const endsMidWord = (inlineCode ? /[^\s`]$/ : /\S$/).test(text)
  const ready = streaming && endsMidWord ? words.length - 1 : words.length

  const reducedMotion = React.useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    () => false
  )
  // A hidden page gets no animation frames, so the clock would hold the whole
  // reply back until the reader returned.
  const hidden = React.useSyncExternalStore(
    subscribeToVisibility,
    pageIsHidden,
    () => false
  )
  const unwatched = reducedMotion || hidden

  const [previous, setPrevious] = React.useState(text)
  const [shown, setShown] = React.useState(
    revealInitial && !unwatched ? 0 : ready
  )
  const [quiet, setQuiet] = React.useState(revealInitial ? 0 : ready)
  const [typing, setTyping] = React.useState(revealInitial)

  if (text !== previous) {
    setPrevious(text)
    setTyping(false)
    if (!text.startsWith(previous)) {
      setShown(ready)
      setQuiet(ready)
    }
  }

  if (unwatched && shown < ready) {
    setShown(ready)
  }

  const shownRef = React.useRef(shown)
  const clock = React.useRef({
    frame: 0,
    last: 0,
    budget: 0,
    /** The stream's arrival rate so far, in words a second. */
    rate: pace,
    arrived: 0,
    received: ready,
  })

  React.useEffect(() => {
    shownRef.current = shown
  }, [shown])

  React.useEffect(() => {
    const state = clock.current

    if (ready < state.received) {
      state.received = ready
      state.arrived = 0
      state.rate = pace
    } else if (ready > state.received) {
      const now = performance.now()
      if (state.arrived) {
        const seconds = Math.max(0.05, (now - state.arrived) / 1000)
        const sample = (ready - state.received) / seconds
        const weight = 1 - Math.exp(-seconds / RATE_WINDOW_SECONDS)
        state.rate = clamp(
          state.rate + (sample - state.rate) * weight,
          MIN_RATE,
          MAX_RATE
        )
      }
      state.arrived = now
      state.received = ready
    }

    if (unwatched || shownRef.current >= ready) return

    // The last tick and the part-spent budget survive a restart, so a burst
    // landing mid-run neither stalls the clock nor makes it skip ahead.
    const tick = (now: number) => {
      const seconds = state.last
        ? Math.min(0.1, (now - state.last) / 1000)
        : 1 / 60
      state.last = now

      const backlog = ready - shownRef.current
      if (backlog <= 0) {
        state.frame = 0
        state.last = 0
        state.budget = 0
        return
      }

      let rate: number
      if (typing) {
        rate = pace
      } else if (streaming) {
        const reserve = state.rate * RESERVE_SECONDS
        rate = Math.max(
          state.rate * clamp(backlog / reserve, 0.4, 3),
          (backlog - reserve) / CATCH_UP_SECONDS
        )
      } else {
        rate = Math.max(state.rate, backlog / CATCH_UP_SECONDS)
      }

      state.budget += rate * seconds
      const step = Math.floor(state.budget)
      if (step > 0) {
        state.budget -= step
        shownRef.current = Math.min(ready, shownRef.current + step)
        setShown(shownRef.current)
      }

      state.frame = requestAnimationFrame(tick)
    }

    state.frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(state.frame)
      state.frame = 0
    }
  }, [ready, streaming, typing, pace, unwatched])

  const visible = Math.min(shown, words.length)
  const busy = streaming || visible < words.length

  const onRevealedRef = React.useRef(onRevealed)
  const wasBusy = React.useRef(busy)

  React.useEffect(() => {
    onRevealedRef.current = onRevealed
  })

  React.useEffect(() => {
    if (wasBusy.current && !busy) onRevealedRef.current?.()
    wasBusy.current = busy
  }, [busy])

  return (
    <span
      data-slot="stream-text"
      data-streaming={busy || undefined}
      aria-busy={busy || undefined}
      className={cn("whitespace-pre-wrap", className)}
      {...props}
    >
      {renderWords(
        lead,
        words.slice(0, visible),
        Math.max(quiet, visible - LIVE_WORDS),
        busy ? visible - freshWords : visible
      )}
      {busy ? (
        <span
          aria-hidden
          data-slot="stream-text-caret"
          className="ms-0.5 inline-block h-3.5 w-0.5 animate-caret-blink bg-live align-middle motion-reduce:animate-none"
        />
      ) : null}
    </span>
  )
}

export { StreamText }
