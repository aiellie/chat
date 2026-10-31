"use client"

import { FilterHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  markOf,
  type ChatNavChat,
} from "@/components/nav-chats"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { SidebarGroupAction } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type ChatNavSort = "recent" | "oldest" | "name"

type ChatNavView = {
  sort: ChatNavSort
  /** Keeps chats that are running, failed or unread above the rest. */
  activeFirst: boolean
}

const SORTS: { id: ChatNavSort; name: string }[] = [
  { id: "recent", name: "Recent activity" },
  { id: "oldest", name: "Oldest first" },
  { id: "name", name: "Name" },
]

const DEFAULT_VIEW: ChatNavView = { sort: "recent", activeFirst: false }

const needsAttention = (chat: ChatNavChat) => markOf(chat) !== null

// Chats arrive newest first, so "oldest" is only that order turned around.
function arrange(chats: ChatNavChat[], view: ChatNavView) {
  const sorted =
    view.sort === "oldest"
      ? [...chats].reverse()
      : view.sort === "name"
        ? [...chats].sort((a, b) => a.title.localeCompare(b.title))
        : chats
  if (!view.activeFirst) return sorted
  return [
    ...sorted.filter(needsAttention),
    ...sorted.filter((chat) => !needsAttention(chat)),
  ]
}

function ChatNavFilter({
  label,
  view,
  onViewChange,
  className,
}: {
  /** The section it arranges, read out on the button. */
  label: string
  view: ChatNavView
  onViewChange: (view: ChatNavView) => void
  className?: string
}) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <SidebarGroupAction
            className={cn("text-muted-foreground", className)}
          />
        }
      >
        <HugeiconsIcon icon={FilterHorizontalIcon} aria-hidden />
        <span className="sr-only">Arrange {label}</span>
      </MenuTrigger>
      <MenuContent align="end" className="min-w-44">
        <MenuGroup>
          <MenuGroupLabel>Sort by</MenuGroupLabel>
          <MenuRadioGroup
            value={view.sort}
            onValueChange={(sort: ChatNavSort) =>
              onViewChange({ ...view, sort })
            }
          >
            {SORTS.map((sort) => (
              <MenuRadioItem key={sort.id} value={sort.id}>
                {sort.name}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Organize</MenuGroupLabel>
          <MenuCheckboxItem
            checked={view.activeFirst}
            onCheckedChange={(activeFirst) =>
              onViewChange({ ...view, activeFirst })
            }
          >
            Needs attention first
          </MenuCheckboxItem>
        </MenuGroup>
      </MenuContent>
    </Menu>
  )
}

export { ChatNavFilter, DEFAULT_VIEW, arrange }
export type { ChatNavView }
