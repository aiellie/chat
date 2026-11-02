"use client"

import * as React from "react"
import {
  AiMagicIcon,
  Airplane01Icon,
  Book02Icon,
  Briefcase01Icon,
  BulbIcon,
  Camera01Icon,
  ChartLineData01Icon,
  Dumbbell01Icon,
  FavouriteIcon,
  Folder01Icon,
  GameController01Icon,
  Globe02Icon,
  Home01Icon,
  Leaf01Icon,
  Megaphone01Icon,
  Mortarboard01Icon,
  MusicNote01Icon,
  PaintBoardIcon,
  Rocket01Icon,
  ShoppingBag01Icon,
  SourceCodeIcon,
  Target02Icon,
  TestTube01Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** The icons a project can wear, by the name the store keeps. */
const PROJECT_ICONS: Record<string, { label: string; icon: IconSvgElement }> = {
  folder: { label: "Folder", icon: Folder01Icon },
  rocket: { label: "Rocket", icon: Rocket01Icon },
  target: { label: "Target", icon: Target02Icon },
  idea: { label: "Idea", icon: BulbIcon },
  book: { label: "Book", icon: Book02Icon },
  work: { label: "Briefcase", icon: Briefcase01Icon },
  code: { label: "Code", icon: SourceCodeIcon },
  design: { label: "Design", icon: PaintBoardIcon },
  chart: { label: "Chart", icon: ChartLineData01Icon },
  marketing: { label: "Megaphone", icon: Megaphone01Icon },
  team: { label: "Team", icon: UserGroupIcon },
  research: { label: "Test tube", icon: TestTube01Icon },
  ai: { label: "AI", icon: AiMagicIcon },
  home: { label: "Home", icon: Home01Icon },
  globe: { label: "Globe", icon: Globe02Icon },
  school: { label: "School", icon: Mortarboard01Icon },
  fitness: { label: "Fitness", icon: Dumbbell01Icon },
  travel: { label: "Travel", icon: Airplane01Icon },
  music: { label: "Music", icon: MusicNote01Icon },
  photo: { label: "Camera", icon: Camera01Icon },
  shopping: { label: "Shopping", icon: ShoppingBag01Icon },
  heart: { label: "Heart", icon: FavouriteIcon },
  nature: { label: "Leaf", icon: Leaf01Icon },
  games: { label: "Games", icon: GameController01Icon },
}

/**
 * The colours a project can wear: a pale tile with the icon in the colour's
 * ink, deeper in dark, and the swatch it's picked from. Whole class strings,
 * so Tailwind finds them.
 */
const PROJECT_COLORS: Record<
  string,
  { label: string; tile: string; swatch: string }
> = {
  gray: {
    label: "Gray",
    tile: "bg-muted text-foreground",
    swatch: "bg-zinc-400",
  },
  red: {
    label: "Red",
    tile: "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400",
    swatch: "bg-red-500",
  },
  orange: {
    label: "Orange",
    tile: "bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400",
    swatch: "bg-orange-500",
  },
  amber: {
    label: "Amber",
    tile: "bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
    swatch: "bg-amber-500",
  },
  green: {
    label: "Green",
    tile: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    swatch: "bg-green-500",
  },
  teal: {
    label: "Teal",
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
    swatch: "bg-teal-500",
  },
  blue: {
    label: "Blue",
    tile: "bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400",
    swatch: "bg-blue-500",
  },
  indigo: {
    label: "Indigo",
    tile: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-400",
    swatch: "bg-indigo-500",
  },
  violet: {
    label: "Violet",
    tile: "bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-400",
    swatch: "bg-violet-500",
  },
  pink: {
    label: "Pink",
    tile: "bg-pink-50 text-pink-500 dark:bg-pink-500/15 dark:text-pink-400",
    swatch: "bg-pink-500",
  },
}

const DEFAULT_ICON = "folder"
const DEFAULT_COLOR = "gray"

/** A project's tile: its icon on its colour. Unknown names fall back. */
function ProjectTile({
  icon,
  color,
  className,
}: {
  icon?: string
  color?: string
  className?: string
}) {
  const mark = (PROJECT_ICONS[icon ?? ""] ?? PROJECT_ICONS[DEFAULT_ICON]).icon
  const tile = (PROJECT_COLORS[color ?? ""] ?? PROJECT_COLORS[DEFAULT_COLOR])
    .tile
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        tile,
        className
      )}
    >
      <HugeiconsIcon aria-hidden icon={mark} className="size-5" />
    </span>
  )
}

/**
 * The tile as a button that opens a popover to pick the colour, then the
 * icon. Picking a colour keeps it open, so the icons can be seen in it;
 * picking an icon closes it.
 */
function ProjectIconPicker({
  icon = DEFAULT_ICON,
  color = DEFAULT_COLOR,
  onIconChange,
  onColorChange,
}: {
  icon?: string
  color?: string
  onIconChange: (icon: string) => void
  onColorChange: (color: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ink = (PROJECT_COLORS[color] ?? PROJECT_COLORS[DEFAULT_COLOR]).tile

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Icon and color"
        className="shrink-0 rounded-lg transition-transform duration-80 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] motion-reduce:transition-none"
      >
        <ProjectTile icon={icon} color={color} />
      </PopoverTrigger>
      {/* Solid, as it opens inside a dialog: one layer of glass at a time. */}
      <PopoverContent
        align="start"
        className="w-auto gap-3 p-3 backdrop-blur-none supports-[backdrop-filter]:bg-popover dark:supports-[backdrop-filter]:bg-popover"
      >
        <div
          role="radiogroup"
          aria-label="Color"
          className="flex flex-wrap gap-1.5"
        >
          {Object.entries(PROJECT_COLORS).map(([name, { label, swatch }]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={name === color}
              aria-label={label}
              title={label}
              onClick={() => onColorChange(name)}
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-white transition-transform duration-80 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 motion-reduce:transition-none",
                swatch
              )}
            >
              {name === color ? (
                <HugeiconsIcon
                  aria-hidden
                  icon={Tick02Icon}
                  className="size-3.5"
                  strokeWidth={2.5}
                />
              ) : null}
            </button>
          ))}
        </div>
        <div
          role="radiogroup"
          aria-label="Icon"
          className="grid grid-cols-8 gap-0.5"
        >
          {Object.entries(PROJECT_ICONS).map(
            ([name, { label, icon: mark }]) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={name === icon}
                aria-label={label}
                title={label}
                onClick={() => {
                  onIconChange(name)
                  setOpen(false)
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-[background-color,scale] duration-80 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-90 motion-reduce:transition-none",
                  name === icon ? ink : "text-muted-foreground"
                )}
              >
                <HugeiconsIcon aria-hidden icon={mark} className="size-4.5" />
              </button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { ProjectIconPicker, ProjectTile }
