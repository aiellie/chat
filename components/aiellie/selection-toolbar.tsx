"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  ArrowDown01Icon,
  QuoteDownIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu"
import { cn } from "@/lib/utils"

/** Somewhere a highlight can be saved, as a row in the Save menu. */
type SaveOption = {
  label: string
  icon?: IconSvgElement
  onSave: (text: string) => void | Promise<void>
}

/** What's highlighted, and the box to float over. */
type Highlight = { text: string; rect: DOMRect }

// The toolbar's height and the gap it keeps above the highlight, to place
// it, or below when there's no room above.
const HEIGHT = 36
const GAP = 8

/**
 * The text highlighted inside `region`, if any, and where it is on screen.
 * A highlight running outside the region, or inside a field, isn't one.
 */
function highlightIn(region: HTMLElement): Highlight | undefined {
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return undefined
  const range = selection.getRangeAt(0)
  const text = selection.toString().trim()
  const within = (node: Node) => region.contains(node)
  if (!text || !within(range.startContainer) || !within(range.endContainer))
    return undefined
  const start =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement
  if (start?.closest("input, textarea, [contenteditable=true]"))
    return undefined
  return { text, rect: range.getBoundingClientRect() }
}

/**
 * A small floating bar over text highlighted in what it wraps: Reply hands
 * the text on, as to a composer, and Save opens a menu of places to keep it.
 * It follows the highlight as the page scrolls, and goes once the highlight
 * does. Without `onReply` or any `saveOptions`, it never shows.
 */
function SelectionToolbar({
  onReply,
  saveOptions = [],
  className,
  children,
}: {
  /** Called with the highlighted text. Without it, there's no Reply. */
  onReply?: (text: string) => void
  /** The Save menu's rows. Without any, there's no Save. */
  saveOptions?: SaveOption[]
  className?: string
  children: React.ReactNode
}) {
  const region = React.useRef<HTMLDivElement>(null)
  const [highlight, setHighlight] = React.useState<Highlight>()
  // While the Save menu is open the highlight may clear, as focus moves into
  // the menu, so the bar holds on to what it had.
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  // Set as they change, in their handlers, so a highlight clearing in the
  // same moment doesn't take the bar with it.
  const held = React.useRef(false)
  const openMenu = (open: boolean) => {
    held.current = open
    setMenuOpen(open)
  }

  React.useEffect(() => {
    const update = () => {
      if (held.current || !region.current) return
      setHighlight(highlightIn(region.current))
    }
    document.addEventListener("selectionchange", update)
    // Capture, to hear the thread's own scroller as well as the window.
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      document.removeEventListener("selectionchange", update)
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [])

  // The tick shows for a moment, then the bar goes with the highlight.
  React.useEffect(() => {
    if (!saved) return
    const timeout = setTimeout(() => {
      held.current = false
      setSaved(false)
      setHighlight(undefined)
      document.getSelection()?.removeAllRanges()
    }, 1200)
    return () => clearTimeout(timeout)
  }, [saved])

  const reply = (text: string) => {
    setHighlight(undefined)
    document.getSelection()?.removeAllRanges()
    onReply?.(text)
  }

  const save = async (option: SaveOption, text: string) => {
    held.current = true
    await option.onSave(text)
    setSaved(true)
  }

  const shown = highlight && (onReply || saveOptions.length > 0)
  const above = highlight ? highlight.rect.top - HEIGHT - GAP > 0 : true

  return (
    <div ref={region} data-slot="selection-toolbar-region" className="contents">
      {children}
      {shown
        ? createPortal(
            <div
              data-slot="selection-toolbar"
              role="toolbar"
              aria-label="Highlighted text"
              // Pressing a button mustn't clear the highlight it acts on.
              onMouseDown={(event) => event.preventDefault()}
              style={{
                left: highlight.rect.left + highlight.rect.width / 2,
                top: above
                  ? highlight.rect.top - HEIGHT - GAP
                  : highlight.rect.bottom + GAP,
              }}
              className={cn(
                "fixed z-50 flex h-9 -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border/40 bg-popover p-1 text-sm shadow-md backdrop-blur-xs supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/70",
                "animate-in duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] fade-in-0 zoom-in-95 motion-reduce:animate-none",
                className
              )}
            >
              {onReply ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reply(highlight.text)}
                >
                  <HugeiconsIcon aria-hidden icon={QuoteDownIcon} />
                  Reply
                </Button>
              ) : null}
              {saveOptions.length > 0 ? (
                <Menu open={menuOpen} onOpenChange={openMenu}>
                  <MenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="aria-expanded:bg-muted"
                      />
                    }
                  >
                    {saved ? (
                      <>
                        <HugeiconsIcon aria-hidden icon={Tick02Icon} />
                        Saved
                      </>
                    ) : (
                      <>
                        Save
                        <HugeiconsIcon
                          aria-hidden
                          icon={ArrowDown01Icon}
                          className="transition-transform duration-150 in-aria-expanded:rotate-180 motion-reduce:transition-none"
                        />
                      </>
                    )}
                  </MenuTrigger>
                  {/* Solid: the bar is already glass, and glass doesn't
                      stack. */}
                  <MenuContent variant="solid" align="end">
                    {saveOptions.map((option) => (
                      <MenuItem
                        key={option.label}
                        onClick={() => save(option, highlight.text)}
                      >
                        {option.icon ? (
                          <HugeiconsIcon aria-hidden icon={option.icon} />
                        ) : null}
                        {option.label}
                      </MenuItem>
                    ))}
                  </MenuContent>
                </Menu>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

export { SelectionToolbar }
export type { SaveOption }
