"use client"

import * as React from "react"
import {
  Cancel01Icon,
  LayoutAlignBottomIcon,
  LayoutAlignLeftIcon,
  LayoutAlignRightIcon,
  SidebarBottomIcon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Layout, LayoutChangedMeta } from "react-resizable-panels"
import { usePanelRef } from "react-resizable-panels"

import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Side = "left" | "right" | "bottom"

// `fill` is whether a panel's toggle takes a fill while the panel is open.
const PANELS = {
  left: {
    title: "Left",
    size: ["18rem", "12rem", "28rem"],
    key: "b",
    openIcon: SidebarLeftIcon,
    closedIcon: LayoutAlignLeftIcon,
    fill: false,
  },
  right: {
    title: "Right",
    size: ["24rem", "16rem", "42rem"],
    key: "i",
    openIcon: SidebarRightIcon,
    closedIcon: LayoutAlignRightIcon,
    fill: true,
  },
  bottom: {
    title: "Bottom",
    size: ["16rem", "8rem", "70%"],
    key: "j",
    openIcon: SidebarBottomIcon,
    closedIcon: LayoutAlignBottomIcon,
    fill: true,
  },
} as const

type PanelsContextValue = {
  isOpen: (side: Side) => boolean
  toggle: (side: Side) => void
  /** Closes a side panel's sheet on a phone. Does nothing on a wide screen. */
  closeSheet: () => void
}

const PanelsContext = React.createContext<PanelsContextValue | null>(null)

function usePanels() {
  const context = React.useContext(PanelsContext)
  if (!context) throw new Error("usePanels must be used within <Panels>.")
  return context
}

function PanelToggle({ side, close = false }: { side: Side; close?: boolean }) {
  const { isOpen, toggle } = usePanels()
  const { title, key, openIcon, closedIcon, fill } = PANELS[side]
  const open = isOpen(side)
  const label = `${open ? "Hide" : "Show"} ${title.toLowerCase()} panel`
  const filled = open && !close && fill

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-slot="panel-toggle"
            variant={filled ? "secondary" : "ghost"}
            size="icon-sm"
            aria-pressed={close ? undefined : open}
            onClick={() => toggle(side)}
            className={cn(
              !filled &&
                "[&_svg]:text-muted-foreground hover:[&_svg]:text-foreground"
            )}
          />
        }
      >
        {/* Keyed so the glyph remounts and replays its entrance as it swaps. */}
        <HugeiconsIcon
          key={String(open)}
          icon={close ? Cancel01Icon : open ? openIcon : closedIcon}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        <kbd
          data-slot="kbd"
          className="rounded-sm bg-background/15 px-1 font-sans"
        >
          ⌘{key.toUpperCase()}
        </kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function PanelHeader({
  title,
  start,
  end,
  border = true,
  glass = false,
}: {
  title: React.ReactNode
  start?: React.ReactNode
  end?: React.ReactNode
  /** Off, the header runs straight into the panel, as a sidebar's does. */
  border?: boolean
  /** Lays the header over the panel's top edge, so the body scrolls under it. */
  glass?: boolean
}) {
  return (
    <header
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 bg-background px-2",
        border && "border-b",
        glass &&
          "absolute inset-x-0 top-0 z-[var(--z-sticky,20)] bg-popover backdrop-blur-xs supports-[backdrop-filter]:bg-background/60"
      )}
    >
      {start}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {typeof title === "string" && title ? (
          <span className="min-w-0 truncate px-1 text-xs font-medium text-muted-foreground">
            {title}
          </span>
        ) : (
          title
        )}
      </div>
      {end ? (
        <div className="flex shrink-0 items-center gap-1">{end}</div>
      ) : null}
    </header>
  )
}

// Collapses rather than unmounting: an unmounted panel hands its space to a
// neighbour, which can throw the other side out to its largest size. The
// handle is disabled, not removed, or the library lets the gap be dragged.
function CollapsiblePanel({
  side,
  open,
  children,
}: {
  side: Side
  open: boolean
  children: React.ReactNode
}) {
  const panelRef = usePanelRef()
  const [defaultSize, minSize, maxSize] = PANELS[side].size

  // Only a change of `open` moves the panel, so a drag that closes it isn't
  // echoed back as an expand.
  const syncedRef = React.useRef<boolean | null>(null)
  React.useEffect(() => {
    const panel = panelRef.current
    if (!panel || syncedRef.current === open) return
    syncedRef.current = open
    if (open) panel.resize(defaultSize)
    else panel.collapse()
  }, [open, panelRef, defaultSize])

  const handle = (
    <ResizableHandle
      withHandle
      disabled={!open}
      className={cn(!open && "pointer-events-none invisible")}
    />
  )

  // `defaultSize` and `minSize` are only read on mount, so they have to agree
  // with the first render.
  const panel = (
    <ResizablePanel
      id={`panel-${side}`}
      panelRef={panelRef}
      inert={!open}
      collapsible
      collapsedSize={0}
      defaultSize={open ? defaultSize : 0}
      minSize={open ? minSize : 0}
      maxSize={maxSize}
      groupResizeBehavior="preserve-pixel-size"
      className="flex flex-col bg-background"
      style={{ overflow: "hidden" }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={
          side === "bottom" ? { minHeight: minSize } : { minWidth: minSize }
        }
      >
        {children}
      </div>
    </ResizablePanel>
  )

  return side === "left" ? (
    <>
      {panel}
      {handle}
    </>
  ) : (
    <>
      {handle}
      {panel}
    </>
  )
}

function PanelBody({
  scroll = true,
  children,
}: {
  scroll?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1",
        scroll ? "overflow-auto" : "flex flex-col overflow-hidden"
      )}
    >
      {children}
    </div>
  )
}

function PanelSheet({
  side,
  header,
  border,
  toggleAt = "end",
  open,
  onOpenChange,
  children,
}: {
  side: "left" | "right"
  header?: React.ReactNode
  border?: boolean
  toggleAt?: "start" | "end"
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const { title } = PANELS[side]
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className="gap-0 bg-background text-foreground"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title} panel</SheetTitle>
          <SheetDescription>
            Slides over the page on small screens.
          </SheetDescription>
        </SheetHeader>
        <PanelHeader
          title={header === undefined ? title : header}
          border={border}
          {...{ [toggleAt]: <PanelToggle side={side} close /> }}
        />
        <PanelBody>{children}</PanelBody>
      </SheetContent>
    </Sheet>
  )
}

const DURATION = 280
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"

// Only on while a toggle animates, since a drag has to follow the pointer.
const ANIMATING =
  "data-animating:*:transition-[flex-grow] data-animating:*:duration-280 data-animating:*:ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:*:transition-none"

// A drag past a panel's minimum snaps it shut, or open again, in one step. A
// CSS transition can't be switched on in time for that step without also
// dragging behind the pointer, so the snap is played back from the sizes on
// either side of it.
function useSnapAnimation(skip: React.RefObject<boolean>) {
  const groupRef = React.useRef<HTMLDivElement>(null)
  const layoutRef = React.useRef<Layout | null>(null)

  const onLayoutChange = (layout: Layout) => {
    const previous = layoutRef.current
    layoutRef.current = layout
    const group = groupRef.current
    if (!previous || !group || skip.current) return

    const snapped = Object.keys(layout).some(
      (id) => (previous[id] ?? 0) > 0 !== (layout[id] ?? 0) > 0
    )
    if (!snapped) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    for (const id of Object.keys(layout)) {
      const panel = group.querySelector<HTMLElement>(`:scope > [id="${id}"]`)
      if (!panel || previous[id] === undefined) continue
      panel.getAnimations().forEach((animation) => animation.cancel())
      panel.animate([{ flexGrow: previous[id] }, { flexGrow: layout[id] }], {
        duration: DURATION,
        easing: EASE_OUT,
      })
    }
  }

  return { elementRef: groupRef, onLayoutChange }
}

function Panels({
  left,
  right,
  bottom,
  headers = {},
  headerBorder = {},
  glassHeader = false,
  toggleAt = {},
  defaultOpen = { left: true, right: false, bottom: false },
  className,
  children,
}: {
  left?: React.ReactNode
  right?: React.ReactNode
  bottom?: React.ReactNode
  /** What each header shows in place of the panel's name. */
  headers?: Partial<Record<Side | "main", React.ReactNode>>
  /** Which headers leave off the rule under them. Each has one by default. */
  headerBorder?: Partial<Record<Side | "main", boolean>>
  /** Main content scrolls under its header, so it must pad its own top 40px. */
  glassHeader?: boolean
  /** "end" by default, or "start", ahead of whatever `headers` gives it. */
  toggleAt?: Partial<Record<Side, "start" | "end">>
  defaultOpen?: Partial<Record<Side, boolean>>
  className?: string
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const hasLeft = left != null
  const hasRight = right != null
  const hasBottom = bottom != null
  const has = React.useMemo(
    () => ({ left: hasLeft, right: hasRight, bottom: hasBottom }),
    [hasLeft, hasRight, hasBottom]
  )
  const [open, setOpen] = React.useState({
    left: false,
    right: false,
    bottom: false,
    ...defaultOpen,
  })
  // The side sheet that is up, on a phone. It is separate from the rails so a
  // sheet never pops open by itself on the way down from a wide screen.
  const [sheet, setSheet] = React.useState<"left" | "right" | null>(null)
  const [animating, setAnimating] = React.useState(false)
  // Read by the snap animation, which a toggle's own transition already covers.
  const animatingRef = React.useRef(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timerRef.current), [])
  const rowSnap = useSnapAnimation(animatingRef)
  const columnSnap = useSnapAnimation(animatingRef)

  const value = React.useMemo<PanelsContextValue>(
    () => ({
      isOpen: (side) =>
        isMobile && side !== "bottom" ? sheet === side : open[side],
      toggle: (side) => {
        if (isMobile && side !== "bottom") {
          setSheet((current) => (current === side ? null : side))
          return
        }
        clearTimeout(timerRef.current)
        setAnimating(true)
        animatingRef.current = true
        timerRef.current = setTimeout(() => {
          setAnimating(false)
          animatingRef.current = false
        }, DURATION)
        setOpen((current) => ({ ...current, [side]: !current[side] }))
      },
      closeSheet: () => setSheet(null),
    }),
    [isMobile, open, sheet]
  )

  // Growing past a phone's width drops the sheets; forget them too, or
  // shrinking back would bring one straight back.
  if (!isMobile && sheet) setSheet(null)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return
      const side = (Object.keys(PANELS) as Side[]).find(
        (side) => has[side] && PANELS[side].key === event.key.toLowerCase()
      )
      if (!side) return
      event.preventDefault()
      value.toggle(side)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [value, has])

  // A drag or a resize key can close a panel, or open a closed one, so the
  // state follows the layout whenever the person, not the code, changed it.
  const syncFrom =
    (sides: Side[]) =>
    (layout: Layout, { isUserInteraction }: LayoutChangedMeta) => {
      if (!isUserInteraction) return
      setOpen((current) => {
        const next = { ...current }
        for (const side of sides) {
          if (has[side]) next[side] = (layout[`panel-${side}`] ?? 0) > 0
        }
        return next
      })
    }

  const leftOpen = open.left && !isMobile
  const rightOpen = open.right && !isMobile
  const bottomToggle = has.bottom ? <PanelToggle side="bottom" /> : null

  return (
    <PanelsContext.Provider value={value}>
      <ResizablePanelGroup
        data-animating={animating || undefined}
        {...rowSnap}
        onLayoutChanged={syncFrom(isMobile ? [] : ["left", "right"])}
        className={cn("h-svh", ANIMATING, className)}
      >
        {has.left ? (
          <CollapsiblePanel side="left" open={leftOpen}>
            <PanelHeader
              title={"left" in headers ? headers.left : PANELS.left.title}
              border={headerBorder.left}
              {...{ [toggleAt.left ?? "end"]: <PanelToggle side="left" /> }}
            />
            {/* On a phone `left` is in its sheet, so it isn't mounted twice. */}
            <PanelBody>{isMobile ? null : left}</PanelBody>
          </CollapsiblePanel>
        ) : null}
        <ResizablePanel id="panel-content">
          <ResizablePanelGroup
            orientation="vertical"
            data-animating={animating || undefined}
            {...columnSnap}
            onLayoutChanged={syncFrom(["bottom"])}
            className={ANIMATING}
          >
            <ResizablePanel
              id="panel-main"
              className={cn("flex flex-col", glassHeader && "relative isolate")}
              style={{ overflow: "hidden" }}
            >
              <PanelHeader
                title={headers.main ?? "Main"}
                border={headerBorder.main}
                glass={glassHeader}
                start={
                  has.left && !leftOpen ? <PanelToggle side="left" /> : null
                }
                end={
                  rightOpen ? null : (
                    <>
                      {bottomToggle}
                      {has.right ? <PanelToggle side="right" /> : null}
                    </>
                  )
                }
              />
              <PanelBody scroll={false}>{children}</PanelBody>
            </ResizablePanel>
            {has.bottom ? (
              <CollapsiblePanel side="bottom" open={open.bottom}>
                <PanelHeader
                  title={headers.bottom ?? PANELS.bottom.title}
                  border={headerBorder.bottom}
                  {...{
                    [toggleAt.bottom ?? "end"]: (
                      <PanelToggle side="bottom" close />
                    ),
                  }}
                />
                <PanelBody>{bottom}</PanelBody>
              </CollapsiblePanel>
            ) : null}
          </ResizablePanelGroup>
        </ResizablePanel>
        {has.right ? (
          <CollapsiblePanel side="right" open={rightOpen}>
            <PanelHeader
              title={headers.right ?? PANELS.right.title}
              border={headerBorder.right}
              start={
                toggleAt.right === "start" ? <PanelToggle side="right" /> : null
              }
              end={
                <>
                  {bottomToggle}
                  {toggleAt.right === "start" ? null : (
                    <PanelToggle side="right" />
                  )}
                </>
              }
            />
            <PanelBody>{isMobile ? null : right}</PanelBody>
          </CollapsiblePanel>
        ) : null}
      </ResizablePanelGroup>

      {isMobile ? (
        <>
          {has.left ? (
            <PanelSheet
              side="left"
              header={headers.left}
              border={headerBorder.left}
              toggleAt={toggleAt.left}
              open={sheet === "left"}
              onOpenChange={(next) => setSheet(next ? "left" : null)}
            >
              {left}
            </PanelSheet>
          ) : null}
          {has.right ? (
            <PanelSheet
              side="right"
              header={headers.right}
              border={headerBorder.right}
              toggleAt={toggleAt.right}
              open={sheet === "right"}
              onOpenChange={(next) => setSheet(next ? "right" : null)}
            >
              {right}
            </PanelSheet>
          ) : null}
        </>
      ) : null}
    </PanelsContext.Provider>
  )
}

export { Panels, usePanels }
