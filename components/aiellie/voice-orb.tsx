"use client"

import * as React from "react"
import { MicOff01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Warp,
  type PaperShaderElement,
  type WarpProps,
} from "@paper-design/shaders-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// The orb a voice chat shows above the composer. It only draws: what state
// the chat is in and how loud it is come from whoever renders it.

type VoiceState = "connecting" | "listening" | "speaking" | "muted" | "failed"

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

export { VoiceOrb, VoiceStage }
export type { VoiceState }
