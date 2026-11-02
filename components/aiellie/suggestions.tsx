"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Fades an edge of a scrolling row only while more of it is hidden past that
// edge.
function useScrollFade(enabled: boolean) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [edges, setEdges] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const update = () => {
      // Negative in a right-to-left row, so the distance is what counts.
      const scrolled = Math.abs(element.scrollLeft)
      const start = scrolled > 0
      const end = scrolled + element.clientWidth < element.scrollWidth - 1
      setEdges((current) =>
        current.start === start && current.end === end
          ? current
          : { start, end }
      )
    }
    update()
    element.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      element.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [enabled])

  const style: React.CSSProperties | undefined =
    enabled && (edges.start || edges.end)
      ? {
          maskImage: `linear-gradient(to var(--suggestions-end), ${edges.start ? "transparent" : "#000"}, #000 1.5rem, #000 calc(100% - 1.5rem), ${edges.end ? "transparent" : "#000"})`,
        }
      : undefined

  return { ref, style }
}

// The set arrives together, each one 70ms after the last. Key the row to
// replay it with a fresh set.
function Suggestions({
  scroll = false,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  /** Keeps the set on one line, scrolling sideways instead of wrapping. */
  scroll?: boolean
}) {
  const { ref, style: fade } = useScrollFade(scroll)

  return (
    <div
      ref={ref}
      data-slot="suggestions"
      data-scroll={scroll || undefined}
      style={{ ...fade, ...style }}
      className={cn(
        "flex flex-wrap gap-2 *:animate-in *:duration-280 *:ease-[cubic-bezier(0.16,1,0.3,1)] *:fade-in-0 *:fill-mode-both *:slide-in-from-bottom-1 data-scroll:[scrollbar-width:none] data-scroll:flex-nowrap data-scroll:overflow-x-auto data-scroll:overscroll-x-contain data-scroll:[--suggestions-end:right] data-scroll:*:shrink-0 motion-reduce:*:animate-none data-scroll:rtl:[--suggestions-end:left] data-scroll:[&::-webkit-scrollbar]:hidden [&>:nth-child(2)]:[animation-delay:70ms] [&>:nth-child(3)]:[animation-delay:140ms] [&>:nth-child(4)]:[animation-delay:210ms] [&>:nth-child(5)]:[animation-delay:280ms] [&>:nth-child(n+6)]:[animation-delay:350ms]",
        className
      )}
      {...props}
    />
  )
}

function Suggestion({
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button data-slot="suggestion" variant={variant} size={size} {...props} />
  )
}

export { Suggestion, Suggestions }
