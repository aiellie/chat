import {
  GlobalSearchIcon,
  LeftToRightListNumberIcon,
  Mail01Icon,
  Sun03Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

// Each tool's mark, by its id in lib/tools/catalog.ts: the icon its part in
// the thread draws where it has one, on a tile of its own colour. The Tools
// page and a new chat's suggestions both show it, so a tool looks the same
// in both. A new tool gets a row in each.

const TOOL_ICONS: Record<string, IconSvgElement> = {
  "web-search": GlobalSearchIcon,
  plan: LeftToRightListNumberIcon,
  weather: Sun03Icon,
  email: Mail01Icon,
}

// A pale fill and the icon's ink, lighter ink on a deeper fill in the dark.
const TOOL_COLORS: Record<string, string> = {
  "web-search":
    "bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400",
  plan: "bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  weather: "bg-sky-50 text-sky-500 dark:bg-sky-500/15 dark:text-sky-400",
  email:
    "bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-400",
}

/**
 * A tool's mark: its icon on its coloured tile. A tool with no mark yet gets
 * a wrench on a hairline tile. Size it with `className`, and its icon with
 * `iconClassName`.
 */
function ToolMark({
  id,
  className,
  iconClassName,
}: {
  id: string
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      aria-hidden
      data-slot="tool-mark"
      className={cn(
        "flex shrink-0 items-center justify-center",
        TOOL_COLORS[id] ?? "border border-border/60 text-muted-foreground",
        className
      )}
    >
      {/* Its tile's ink, even inside a button that greys its icons. */}
      <HugeiconsIcon
        icon={TOOL_ICONS[id] ?? Wrench01Icon}
        className={cn("text-current!", iconClassName)}
      />
    </span>
  )
}

export { TOOL_COLORS, TOOL_ICONS, ToolMark }
