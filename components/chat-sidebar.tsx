"use client"

import * as React from "react"
import { BellDotIcon, BellIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  ChatNavPinned,
  ChatNavRecents,
  markOf,
  type ChatNavProps,
} from "@/components/nav-chats"
import { ChatNavMain } from "@/components/nav-main"
import {
  ChatSwitcher,
  type ChatMode,
} from "@/components/chat-switcher"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { NavUser, type User } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const liveOn =
  "bg-live/4 [&_svg]:text-live hover:bg-live/7 hover:[&_svg]:text-live"

// Fades an edge of the list only while more of it is hidden past that edge.
function useScrollFade() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [edges, setEdges] = React.useState({ top: false, bottom: false })

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const top = element.scrollTop > 0
      const bottom =
        element.scrollTop + element.clientHeight < element.scrollHeight - 1
      setEdges((current) =>
        current.top === top && current.bottom === bottom
          ? current
          : { top, bottom }
      )
    }
    update()
    element.addEventListener("scroll", update, { passive: true })
    // Watches the list as well as the box, since a section folding changes how
    // much there is to scroll without a scroll event.
    const observer = new ResizeObserver(update)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => {
      element.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  const style: React.CSSProperties | undefined =
    edges.top || edges.bottom
      ? {
          maskImage: `linear-gradient(to bottom, ${edges.top ? "transparent" : "#000"}, #000 1.5rem, #000 calc(100% - 1.5rem), ${edges.bottom ? "transparent" : "#000"})`,
        }
      : undefined

  return { ref, style }
}

function ChatSidebarHeader({
  mode,
  onModeChange,
  onSearch,
  activityOpen,
  onActivity,
}: {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  onSearch?: () => void
  activityOpen: boolean
  onActivity: () => void
}) {
  return (
    <SidebarHeader className="flex-row items-center gap-1 py-0">
      <SidebarMenu className="w-fit">
        <SidebarMenuItem>
          <ChatSwitcher value={mode} onValueChange={onModeChange} />
        </SidebarMenuItem>
      </SidebarMenu>
      <div className="ms-auto flex items-center gap-0.5">
        <TooltipIconButton
          tooltip="Search"
          shortcut="⌘K"
          onClick={onSearch}
          className="size-7"
        >
          <HugeiconsIcon icon={Search01Icon} />
        </TooltipIconButton>
        <TooltipIconButton
          tooltip="Activity"
          shortcut="⌘⇧U"
          aria-pressed={activityOpen}
          onClick={onActivity}
          className={cn("size-7", activityOpen && liveOn)}
        >
          <HugeiconsIcon icon={activityOpen ? BellDotIcon : BellIcon} />
        </TooltipIconButton>
      </div>
    </SidebarHeader>
  )
}

function ChatSidebar({
  user,
  usage,
  mode,
  onModeChange,
  onNewChat,
  onQuickChat,
  onProjects,
  onSearch,
  activityOpen,
  onActivity,
  userMenu,
  ...chats
}: ChatNavProps & {
  /** Who is signed in. Without one, the footer offers to sign in. */
  user?: User
  /** How much of the plan is left, e.g. "72% left". */
  usage?: string
  /** Passed on to the user menu. */
  userMenu?: Omit<React.ComponentProps<typeof NavUser>, "user" | "usage">
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  onNewChat: () => void
  onQuickChat?: () => void
  onProjects?: () => void
  onSearch?: () => void
  activityOpen: boolean
  onActivity: () => void
}) {
  const { ref: listRef, style: fadeStyle } = useScrollFade()

  return (
    <Sidebar collapsible="none" className="w-full bg-background">
      <ChatSidebarHeader
        mode={mode}
        onModeChange={onModeChange}
        onSearch={onSearch}
        activityOpen={activityOpen}
        onActivity={onActivity}
      />
      <ChatNavMain
        newChatOpen={chats.activeId === null}
        onNewChat={onNewChat}
        onQuickChat={onQuickChat}
        onProjects={onProjects}
      />
      <SidebarContent
        ref={listRef}
        role="navigation"
        aria-label="Chats"
        style={fadeStyle}
      >
        <div className="flex flex-col">
          <ChatNavPinned {...chats} activity={activityOpen} />
          <ChatNavRecents {...chats} activity={activityOpen} />
          {activityOpen && !chats.chats.some(markOf) ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              Nothing needs you right now.
            </p>
          ) : null}
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50">
        <NavUser {...userMenu} user={user} usage={usage} />
      </SidebarFooter>
    </Sidebar>
  )
}

export { ChatSidebar }
