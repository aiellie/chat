"use client"

import * as React from "react"
import {
  BulbIcon,
  Cancel01Icon,
  Car01Icon,
  Clock01Icon,
  FavouriteIcon,
  Flag02Icon,
  FootballIcon,
  Hamburger01Icon,
  Leaf01Icon,
  Search01Icon,
  SmileIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  TooltipIconButton,
  type TooltipIconButtonProps,
} from "@/components/ui/tooltip-icon-button"
import {
  EMOJI_CATEGORIES,
  findEmoji,
  searchEmojis,
  type Emoji,
  type EmojiCategory,
} from "@/lib/emojis"
import { cn } from "@/lib/utils"

const ICONS: Record<
  string,
  React.ComponentProps<typeof HugeiconsIcon>["icon"]
> = {
  recent: Clock01Icon,
  people: SmileIcon,
  nature: Leaf01Icon,
  food: Hamburger01Icon,
  activities: FootballIcon,
  travel: Car01Icon,
  objects: BulbIcon,
  symbols: FavouriteIcon,
  flags: Flag02Icon,
}

const RECENT_KEY = "aiellie:recent-emoji"
// Two rows' worth.
const RECENT_COUNT = 16

/** The emoji picked last, newest first. */
function savedRecent(): Emoji[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")
    if (!Array.isArray(saved)) return []
    return saved.flatMap((emoji) => {
      const found = typeof emoji === "string" ? findEmoji(emoji) : undefined
      return found ? [found] : []
    })
  } catch {
    return []
  }
}

function remember(emoji: string) {
  const recent = [
    emoji,
    ...savedRecent()
      .map((each) => each.emoji)
      .filter((each) => each !== emoji),
  ].slice(0, RECENT_COUNT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    // Blocked storage only means there's no recent row next time.
  }
}

/**
 * The emoji in the row above or below, nearest the one focused. Worked out
 * from where they sit, since a section's last row can be short.
 */
function nearestInRow(cells: HTMLElement[], from: HTMLElement, down: boolean) {
  const past = cells.filter((cell) =>
    down ? cell.offsetTop > from.offsetTop : cell.offsetTop < from.offsetTop
  )
  if (past.length === 0) return undefined
  const tops = past.map((cell) => cell.offsetTop)
  const row = down ? Math.min(...tops) : Math.max(...tops)
  return past
    .filter((cell) => cell.offsetTop === row)
    .reduce((best, cell) =>
      Math.abs(cell.offsetLeft - from.offsetLeft) <
      Math.abs(best.offsetLeft - from.offsetLeft)
        ? cell
        : best
    )
}

// Memoized, as hovering re-renders the panel to preview each emoji and
// several hundred buttons needn't follow.
const EmojiSections = React.memo(function EmojiSections({
  sections,
}: {
  sections: EmojiCategory[]
}) {
  return sections.map((section, sectionIndex) => (
    <section
      key={section.id}
      data-section={section.id}
      aria-label={section.label}
    >
      <h3 className="sticky top-0 z-10 bg-popover px-1.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
        {section.label}
      </h3>
      <div className="grid grid-cols-8">
        {section.emojis.map((each, index) => (
          <button
            key={each.emoji}
            type="button"
            data-emoji={each.emoji}
            aria-label={each.name}
            // Arrows move between emoji, so only the first is a Tab stop.
            tabIndex={sectionIndex === 0 && index === 0 ? 0 : -1}
            // Clear of the sticky heading when focus scrolls up to it.
            className="flex aspect-square scroll-mt-8 items-center justify-center rounded-md text-xl leading-none outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {each.emoji}
          </button>
        ))}
      </div>
    </section>
  ))
})

function EmojiPanel({
  onPick,
}: {
  /** `more` is set when Shift was held, to keep picking. */
  onPick: (emoji: string, more: boolean) => void
}) {
  const [query, setQuery] = React.useState("")
  // Read once a panel opens, so the row doesn't move under a Shift-click.
  const [recent] = React.useState(savedRecent)
  const [previewed, setPreviewed] = React.useState<Emoji>()
  const scroller = React.useRef<HTMLDivElement>(null)
  const search = React.useRef<HTMLInputElement>(null)

  const browsing = React.useMemo<EmojiCategory[]>(
    () => [
      ...(recent.length > 0
        ? [{ id: "recent", label: "Recently used", emojis: recent }]
        : []),
      ...EMOJI_CATEGORIES,
    ],
    [recent]
  )
  const searching = query.trim() !== ""
  const sections = React.useMemo<EmojiCategory[]>(
    () =>
      searching
        ? [{ id: "results", label: "Results", emojis: searchEmojis(query) }]
        : browsing,
    [searching, query, browsing]
  )
  const empty = searching && sections[0].emojis.length === 0
  const [scrolledTo, setScrolledTo] = React.useState<string>()
  // Until the list scrolls, the first section is the one in view.
  const inView = sections.some((section) => section.id === scrolledTo)
    ? scrolledTo
    : sections[0].id

  const cells = () =>
    Array.from(
      scroller.current?.querySelectorAll<HTMLElement>("[data-emoji]") ?? []
    )

  const pick = (emoji: string, more: boolean) => {
    remember(emoji)
    onPick(emoji, more)
  }

  const changeQuery = (next: string) => {
    setQuery(next)
    if (scroller.current) scroller.current.scrollTop = 0
    setScrolledTo(undefined)
  }

  // The section whose top has scrolled past, or the last once at the bottom,
  // since a short one there never reaches the top.
  const track = () => {
    const box = scroller.current
    if (!box) return
    const tops = Array.from(box.querySelectorAll<HTMLElement>("[data-section]"))
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 1
    const current = atBottom
      ? tops.at(-1)
      : tops.findLast((section) => section.offsetTop <= box.scrollTop + 1)
    setScrolledTo(current?.dataset.section)
  }

  const jumpTo = (id: string) => {
    const box = scroller.current
    const section = box?.querySelector<HTMLElement>(`[data-section="${id}"]`)
    if (!box || !section) return
    box.scrollTop = section.offsetTop
    setScrolledTo(id)
  }

  return (
    <div data-slot="emoji-panel" className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 py-1.5 ps-3 pe-1.5">
        <HugeiconsIcon
          aria-hidden
          icon={Search01Icon}
          strokeWidth={1.5}
          className="size-3.5 shrink-0 text-muted-foreground/70"
        />
        {/* The popover focuses this on open, except by touch, where it would bring up the keyboard. */}
        <input
          ref={search}
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search emoji"
          placeholder="Search emoji"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              cells()[0]?.focus()
            } else if (event.key === "Enter" && searching) {
              // Enter takes the best match without leaving the box.
              event.preventDefault()
              const first = sections[0].emojis[0]
              if (first) pick(first.emoji, event.shiftKey)
            }
          }}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {/* Disabled rather than hidden while empty, so the field's end doesn't shift as you type. */}
        <button
          type="button"
          aria-label="Clear search"
          disabled={!query}
          onClick={() => {
            changeQuery("")
            search.current?.focus()
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground/70 transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:border-ring disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none dark:hover:bg-foreground/[0.09]"
        >
          <HugeiconsIcon
            aria-hidden
            icon={Cancel01Icon}
            strokeWidth={1.5}
            className="size-3"
          />
        </button>
      </div>

      {/* Off while searching: the results are one list with nothing to jump to. */}
      <div
        role="group"
        aria-label="Categories"
        className="flex items-center justify-between border-b border-border/60 px-1.5 py-1"
      >
        {browsing.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-label={section.label}
            title={section.label}
            aria-current={!searching && inView === section.id}
            disabled={searching}
            onClick={() => jumpTo(section.id)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-[current=true]:bg-accent aria-[current=true]:text-foreground motion-reduce:transition-none"
          >
            <HugeiconsIcon
              aria-hidden
              icon={ICONS[section.id]}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        // Positioned, so each emoji's offset is measured from here.
        className="relative h-72 overflow-y-auto overscroll-contain px-1.5 pb-1.5"
        onScroll={track}
        onClick={(event) => {
          const cell = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-emoji]"
          )
          if (cell?.dataset.emoji) pick(cell.dataset.emoji, event.shiftKey)
        }}
        onPointerOver={(event) => {
          const cell = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-emoji]"
          )
          if (cell?.dataset.emoji) setPreviewed(findEmoji(cell.dataset.emoji))
        }}
        onFocus={(event) => {
          const emoji = (event.target as HTMLElement).dataset.emoji
          if (emoji) setPreviewed(findEmoji(emoji))
        }}
        onKeyDown={(event) => {
          const from = event.target as HTMLElement
          if (!from.dataset.emoji) return
          const all = cells()
          const index = all.indexOf(from)
          let next: HTMLElement | undefined
          if (event.key === "ArrowLeft") next = all[index - 1]
          else if (event.key === "ArrowRight") next = all[index + 1]
          else if (event.key === "ArrowDown")
            next = nearestInRow(all, from, true)
          else if (event.key === "ArrowUp")
            // Up from the top row goes back to the search.
            next = nearestInRow(all, from, false) ?? search.current ?? undefined
          else return
          event.preventDefault()
          next?.focus()
        }}
      >
        {empty ? (
          <div className="px-1.5 py-6 text-center text-xs text-muted-foreground/70">
            No emoji match “{query.trim()}”
          </div>
        ) : (
          <EmojiSections sections={sections} />
        )}
      </div>

      <div
        aria-hidden
        className="flex h-11 items-center gap-2 border-t border-border/60 px-3"
      >
        {previewed ? (
          <>
            <span className="text-2xl leading-none">{previewed.emoji}</span>
            <span className="truncate text-xs text-foreground">
              {previewed.name}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground/70">
            Shift-click to add more than one
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * A smiley button whose popover picks an emoji: found by name, or browsed by
 * category with the ones picked last on top. A pick closes it unless Shift
 * is held, so several can go in one after another.
 */
function EmojiSelector({
  onEmojiSelect,
  returnFocus,
  tooltip = "Emoji",
  side = "top",
  align = "start",
  disabled = false,
  className,
}: {
  onEmojiSelect: (emoji: string) => void
  /** Where focus goes once an emoji is picked. Closed any other way, it goes back to the button. */
  returnFocus?: React.RefObject<HTMLElement | null>
  tooltip?: string
  /** Where both the popover and the tooltip open. */
  side?: TooltipIconButtonProps["side"]
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const picked = React.useRef(false)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) picked.current = false
        setOpen(next)
      }}
    >
      <PopoverTrigger
        data-slot="emoji-selector"
        disabled={disabled}
        render={
          <TooltipIconButton
            type="button"
            tooltip={tooltip}
            side={side}
            className={cn(
              "size-7 shrink-0 rounded-full p-1.5 data-popup-open:bg-accent data-popup-open:[&_svg]:text-foreground",
              className
            )}
          />
        }
      >
        <HugeiconsIcon aria-hidden icon={SmileIcon} strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        finalFocus={() => (picked.current && returnFocus?.current) || true}
        className="w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden bg-popover p-0 backdrop-blur-none dark:bg-popover"
      >
        <EmojiPanel
          onPick={(emoji, more) => {
            onEmojiSelect(emoji)
            if (more) return
            picked.current = true
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { EmojiSelector }
