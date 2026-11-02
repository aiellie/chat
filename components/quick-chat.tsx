"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import {
  Cancel01Icon,
  Clock01Icon,
  PencilEdit02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  NO_THREADS,
  getQuickChats,
  setQuickChats,
  subscribeQuickChats,
  titleOf,
} from "@/components/aiellie/thread-store"
import { Chat } from "@/components/chat"
import type { ChatNavChat } from "@/components/nav-chats"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

// Past quick chats, newest first, searchable once there are any.
function QuickChatHistory({
  chats,
  activeId,
  onSelect,
}: {
  chats: ChatNavChat[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <TooltipIconButton
            tooltip="Quick chat history"
            className="size-7 data-popup-open:bg-accent data-popup-open:[&_svg]:text-foreground"
          />
        }
      >
        <HugeiconsIcon icon={Clock01Icon} />
      </MenuTrigger>
      <MenuContent
        align="end"
        className="max-h-80 w-64"
        showSearch={chats.length > 0}
        searchPlaceholder="Search quick chats"
      >
        {chats.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground/70">
            No quick chats yet
          </div>
        ) : (
          chats.map((chat) => (
            <MenuItem key={chat.id} onClick={() => onSelect(chat.id)}>
              <span className="min-w-0 flex-1 truncate">{chat.title}</span>
              {chat.id === activeId ? (
                <HugeiconsIcon
                  aria-label="Open"
                  icon={Tick02Icon}
                  className="shrink-0"
                />
              ) : null}
            </MenuItem>
          ))
        )}
      </MenuContent>
    </Menu>
  )
}

/**
 * A small chat in the corner, for an aside that shouldn't become a thread.
 * It stays open while the rest of the page is used, and ⌘⇧N opens and
 * closes it. Its chats keep their own history, apart from the sidebar's.
 */
function QuickChat({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const chats = React.useSyncExternalStore(
    subscribeQuickChats,
    getQuickChats,
    () => NO_THREADS
  )
  // The quick chat on screen: one from the history, or a new one, which
  // keeps its id once its first message adds it to the history.
  const [id, setId] = React.useState(() => crypto.randomUUID())
  const current = chats.find((chat) => chat.id === id)
  const popupRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || !event.shiftKey)
        return
      // Some keydowns carry no key, such as the ones autofill sends.
      if (event.key?.toLowerCase() !== "n") return
      event.preventDefault()
      onOpenChange(!open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  const focusComposer = () =>
    popupRef.current
      ?.querySelector<HTMLElement>("[data-slot=composer-input]")
      ?.focus()

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      // The page stays usable around it, and pressing it doesn't close it.
      modal={false}
      disablePointerDismissal
    >
      {/* Kept mounted while closed, so a reply on its way still arrives and
          is saved, and the chat is as it was left when it opens again. */}
      <DialogPrimitive.Portal keepMounted>
        <DialogPrimitive.Popup
          ref={popupRef}
          aria-label="Quick chat"
          initialFocus={() =>
            popupRef.current?.querySelector<HTMLElement>(
              "[data-slot=composer-input]"
            ) ?? true
          }
          // Glass, as the menus are. A heavier blur smears the page's text
          // away entirely, and the pane looks solid again.
          className="fixed end-4 bottom-4 isolate z-50 flex h-[min(36rem,calc(100dvh-2rem))] w-[min(26rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border/40 bg-popover text-sm text-foreground shadow-xl backdrop-blur-xs transition-[opacity,scale,translate] duration-150 ease-out outline-none data-ending-style:translate-y-2 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:scale-95 data-starting-style:opacity-0 supports-[backdrop-filter]:bg-background/60 motion-reduce:transition-none rtl:origin-bottom-left dark:supports-[backdrop-filter]:bg-background/70"
        >
          {/* Blurs the thread scrolling under it, which pads its top to start
              below. Untinted, so it's one pane of glass with the rest. */}
          <header className="absolute inset-x-0 top-0 z-20 flex h-10 items-center gap-0.5 ps-3 pe-1.5 backdrop-blur-md">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate font-medium">
              {current?.title ?? "Quick chat"}
            </DialogPrimitive.Title>
            <QuickChatHistory
              chats={chats}
              activeId={id}
              onSelect={(next) => {
                setId(next)
                requestAnimationFrame(focusComposer)
              }}
            />
            <TooltipIconButton
              tooltip="New quick chat"
              onClick={() => {
                setId(crypto.randomUUID())
                requestAnimationFrame(focusComposer)
              }}
              className="size-7"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} />
            </TooltipIconButton>
            <TooltipIconButton
              tooltip="Close"
              shortcut="esc"
              onClick={() => onOpenChange(false)}
              className="size-7"
            >
              <HugeiconsIcon icon={Cancel01Icon} />
            </TooltipIconButton>
          </header>
          {/* Keyed by id, so a new quick chat keeps its component, and its
              stream, when its first message adds it to the history. */}
          <Chat
            key={id}
            id={id}
            compact
            onFirstMessage={(chatId, text) => {
              if (getQuickChats().some((chat) => chat.id === chatId)) return
              setQuickChats((list) => [
                { id: chatId, title: titleOf(text) },
                ...list,
              ])
            }}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { QuickChat }
