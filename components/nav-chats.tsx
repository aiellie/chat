"use client"

import * as React from "react"
import {
  ArrowRight01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  arrange,
  ChatNavFilter,
  DEFAULT_VIEW,
} from "@/components/nav-filter"
import { ChatOptions } from "@/components/chat-options"
import { useRenameInput } from "@/components/editable-title"
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/menu"
import { usePanels } from "@/components/panels"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@/components/ui/status"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type ChatNavStatus = "running" | "completed" | "failed"

type ChatNavChat = {
  id: string
  title: string
  pinned?: boolean
  status?: ChatNavStatus
  /** Finished while it wasn't open, and not opened since. */
  unread?: boolean
}

type ChatNavProps = {
  chats: ChatNavChat[]
  activeId: string | null
  /** Lists only the chats that carry a mark: running, failed or unread. */
  activity?: boolean
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onTogglePin: (id: string) => void
  onArchive: (id: string) => void
  onShare: (id: string) => void
  onFork: (id: string) => void
  onDelete: (id: string) => void
}

type ChatNavMark = "running" | "unread" | "failed"

// A finished chat that has been read needs nothing, so it carries no mark.
function markOf(chat: ChatNavChat): ChatNavMark | null {
  if (chat.status === "running") return "running"
  if (chat.status === "failed") return "failed"
  if (chat.status === "completed" && chat.unread) return "unread"
  return null
}

const MARKS: Record<
  ChatNavMark,
  { label: string; variant: "live" | "destructive"; pulse: boolean }
> = {
  running: { label: "Running", variant: "live", pulse: true },
  unread: { label: "Unread", variant: "live", pulse: false },
  failed: { label: "Failed", variant: "destructive", pulse: false },
}

// Sits where the options button appears, so it gives way whenever that does.
// On a touch screen the button never hides, so the mark moves in beside it.
function ChatNavStatusMark({ mark }: { mark: ChatNavMark }) {
  const { label, variant, pulse } = MARKS[mark]

  return (
    <SidebarMenuBadge className="min-w-5 px-0 transition-opacity duration-80 group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-0 group-has-aria-expanded/menu-item:opacity-0 motion-reduce:transition-none pointer-coarse:end-7 pointer-coarse:opacity-100!">
      <Status
        variant={variant}
        pulse={pulse}
        className="border-0 bg-transparent p-0 dark:bg-transparent"
      >
        <StatusIndicator />
        <StatusLabel className="sr-only">{label}</StatusLabel>
      </Status>
    </SidebarMenuBadge>
  )
}

// A title too long for its row fades out rather than ending in an ellipsis.
// Hovering the row scrolls it once to its end, and leaving scrolls it back. The
// fade moves to the start as the scroll begins, not the moment the row is
// hovered, so a passing pointer doesn't flicker it.
function ChatNavTitle({ title }: { title: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = React.useState(0)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () =>
      setOverflow(Math.max(0, element.scrollWidth - element.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [title])

  return (
    <span
      ref={ref}
      data-overflow={overflow > 0 || undefined}
      style={
        {
          "--overflow": `${overflow}px`,
          // Paced by length rather than a fixed duration, so a long title
          // doesn't race past and a short one doesn't crawl.
          "--scroll-duration": `${Math.max(400, overflow * 25)}ms`,
        } as React.CSSProperties
      }
      className="text-clip! transition-[mask-image] transition-discrete duration-0 group-hover/menu-item:delay-300 data-overflow:[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)] group-hover/menu-item:data-overflow:[mask-image:linear-gradient(to_right,transparent,#000_1.5rem)] motion-reduce:transition-none rtl:data-overflow:[mask-image:linear-gradient(to_left,#000_calc(100%-1.5rem),transparent)] rtl:group-hover/menu-item:data-overflow:[mask-image:linear-gradient(to_left,transparent,#000_1.5rem)]"
    >
      <span className="inline-block transition-[translate] duration-150 ease-out group-hover/menu-item:translate-x-[calc(var(--overflow)*-1)] group-hover/menu-item:delay-300 group-hover/menu-item:duration-(--scroll-duration) group-hover/menu-item:ease-linear motion-reduce:transition-none rtl:group-hover/menu-item:translate-x-(--overflow)">
        {title}
      </span>
    </span>
  )
}

// An empty name keeps the old one rather than naming the chat nothing.
function RenameField({
  title,
  onDone,
}: {
  title: string
  /** Called with the new name, or with nothing if the old one stays. */
  onDone: (title?: string) => void
}) {
  return (
    <SidebarInput
      {...useRenameInput(title, onDone)}
      aria-label="Chat name"
      className="rounded-lg border-sidebar-ring px-2 dark:bg-background"
    />
  )
}

function ChatNavItem({
  chat,
  activeId,
  onSelect,
  onRename,
  onTogglePin,
  onArchive,
  onShare,
  onFork,
  onDelete,
}: Omit<ChatNavProps, "chats"> & { chat: ChatNavChat }) {
  const [renaming, setRenaming] = React.useState(false)
  const { closeSheet } = usePanels()
  const active = chat.id === activeId
  const mark = markOf(chat)

  return (
    <SidebarMenuItem>
      {renaming ? (
        <RenameField
          title={chat.title}
          onDone={(title) => {
            if (title) onRename(chat.id, title)
            setRenaming(false)
          }}
        />
      ) : (
        <>
          <SidebarMenuButton
            isActive={active}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onSelect(chat.id)
              closeSheet()
            }}
            className={cn(mark && "pointer-coarse:pe-14")}
          >
            <ChatNavTitle title={chat.title} />
          </SidebarMenuButton>
          {mark ? <ChatNavStatusMark mark={mark} /> : null}
          <Menu>
            <MenuTrigger
              render={
                <SidebarMenuAction
                  showOnHover
                  className="text-muted-foreground pointer-coarse:opacity-100"
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} />
              <span className="sr-only">Options for {chat.title}</span>
            </MenuTrigger>
            <MenuContent align="start" className="min-w-36">
              <ChatOptions
                pinned={chat.pinned}
                onRename={() => setRenaming(true)}
                onTogglePin={() => onTogglePin(chat.id)}
                onArchive={() => onArchive(chat.id)}
                onShare={() => onShare(chat.id)}
                onFork={() => onFork(chat.id)}
                onDelete={() => onDelete(chat.id)}
              />
            </MenuContent>
          </Menu>
        </>
      )}
    </SidebarMenuItem>
  )
}

// The list folds rather than unmounting, so it can animate shut, and is inert
// while folded so its rows drop out of the tab order.
function ChatNavGroup({
  label,
  chats,
  ...props
}: ChatNavProps & { label: string }) {
  const [open, setOpen] = React.useState(true)
  const [view, setView] = React.useState(DEFAULT_VIEW)
  const listId = React.useId()

  if (chats.length === 0) return null

  return (
    <SidebarGroup>
      <div className="group/label relative">
        <SidebarGroupLabel
          render={
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen((current) => !current)}
            />
          }
          className="group/section w-full gap-1 pe-8 text-muted-foreground hover:text-muted-foreground"
        >
          {label}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            aria-hidden
            className="size-3.5! opacity-0 transition-[opacity,rotate] duration-150 group-hover/label:opacity-100 group-focus-visible/section:opacity-100 group-aria-expanded/section:rotate-90 group-aria-[expanded=false]/section:opacity-100 motion-reduce:transition-none rtl:-scale-x-100"
          />
        </SidebarGroupLabel>
        <ChatNavFilter
          label={label}
          view={view}
          onViewChange={setView}
          className="end-1 top-1.5 opacity-0 group-focus-within/label:opacity-100 group-hover/label:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100"
        />
      </div>
      <div
        id={listId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <SidebarMenu className="gap-0.5">
            {arrange(chats, view).map((chat) => (
              <ChatNavItem key={chat.id} chat={chat} {...props} />
            ))}
          </SidebarMenu>
        </div>
      </div>
    </SidebarGroup>
  )
}

// With activity on, a section keeps only its marked chats, and one with none
// left drops out.
const shown = (chats: ChatNavChat[], activity?: boolean) =>
  activity ? chats.filter((chat) => markOf(chat)) : chats

function ChatNavPinned({ chats, ...props }: ChatNavProps) {
  return (
    <ChatNavGroup
      label="Pinned"
      chats={shown(chats, props.activity).filter((chat) => chat.pinned)}
      {...props}
    />
  )
}

function ChatNavRecents({ chats, ...props }: ChatNavProps) {
  return (
    <ChatNavGroup
      label="Recents"
      chats={shown(chats, props.activity).filter((chat) => !chat.pinned)}
      {...props}
    />
  )
}

export { ChatNavPinned, ChatNavRecents, markOf }
export type { ChatNavChat, ChatNavProps, ChatNavStatus }
