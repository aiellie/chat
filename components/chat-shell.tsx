"use client"

import * as React from "react"
import { PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname } from "next/navigation"

import { Chat } from "@/components/chat"
import { AiDebugButton, AiDebugPanel } from "@/components/aiellie/ai-debug"
import { ChatHeader, ChatHeaderTitle } from "@/components/aiellie/chat-header"
import { HistoryButtons } from "@/components/aiellie/history-buttons"
import {
  NO_THREADS,
  getThreads,
  loadMessages,
  removeMessages,
  saveMessages,
  setThreads,
  subscribeThreads,
} from "@/components/aiellie/thread-store"
import { ChatSidebar } from "@/components/chat-sidebar"
import type { ChatMode } from "@/components/chat-switcher"
import type { ChatNavChat } from "@/components/nav-chats"
import type { User } from "@/components/nav-user"
import { Panels, usePanels } from "@/components/panels"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { useBrowserHistory } from "@/hooks/use-browser-history"

const noop = () => () => {}

// The first line of the first message, cut to fit the sidebar.
function titleOf(text: string) {
  const line = text.trim().split("\n")[0]
  return line.length > 80 ? `${line.slice(0, 80)}…` : line
}

// The chat header, with a new chat button while the left panel, and the one in
// its sidebar, is out of sight.
function MainHeader({
  title,
  onRename,
  onNewChat,
}: {
  title: string
  onRename?: (title: string) => void
  onNewChat: () => void
}) {
  const { isOpen } = usePanels()
  return (
    <ChatHeader>
      {isOpen("left") ? null : (
        <TooltipIconButton
          tooltip="New chat"
          shortcut="⌘N"
          onClick={onNewChat}
          className="size-7"
        >
          <HugeiconsIcon icon={PencilEdit02Icon} />
        </TooltipIconButton>
      )}
      <ChatHeaderTitle title={title} onRename={onRename} />
      <div className="ms-auto" />
      <AiDebugButton />
    </ChatHeader>
  )
}

function ChatShell() {
  const chats = React.useSyncExternalStore(
    subscribeThreads,
    getThreads,
    () => NO_THREADS
  )
  // Saved threads are only in the browser, so the chat waits for it rather
  // than rendering an empty thread on the server first.
  const hydrated = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  // The open thread lives in the URL, as /<thread id>. "/" is a new chat.
  const pathname = usePathname()
  const activeId = decodeURIComponent(pathname.slice(1)) || null
  const open = (id: string | null) =>
    window.history.pushState(null, "", id ? `/${encodeURIComponent(id)}` : "/")
  // The id a new chat gets once its first message is sent.
  const [draftId, setDraftId] = React.useState(() => crypto.randomUUID())
  const [mode, setMode] = React.useState<ChatMode>("chat")
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [user, setUser] = React.useState<User>()

  const update = (id: string, change: Partial<ChatNavChat>) =>
    setThreads((current) =>
      current.map((chat) => (chat.id === id ? { ...chat, ...change } : chat))
    )
  const remove = (id: string) => {
    setThreads((current) => current.filter((chat) => chat.id !== id))
    removeMessages(id)
    if (activeId === id) open(null)
  }

  const history = useBrowserHistory()

  const newChat = () => {
    setDraftId(crypto.randomUUID())
    open(null)
  }

  const toggleActivity = () => setActivityOpen((open) => !open)

  const active = chats.find((chat) => chat.id === activeId)

  return (
    // `contents`, so the wrapper only carries the sidebar's context and sizes
    // while the panels lay out the page.
    <SidebarProvider className="contents">
      <Panels
        // The thread pads its own top to start below it.
        glassHeader
        left={
          <ChatSidebar
            chats={chats}
            activeId={activeId}
            onSelect={(id) => {
              open(id)
              update(id, { unread: false })
            }}
            onRename={(id, title) => update(id, { title })}
            onTogglePin={(id) =>
              update(id, {
                pinned: !chats.find((chat) => chat.id === id)?.pinned,
              })
            }
            onArchive={remove}
            onDelete={remove}
            onShare={() => {}}
            onFork={(id) => {
              const chat = chats.find((chat) => chat.id === id)
              if (!chat) return
              const fork = {
                id: crypto.randomUUID(),
                title: `${chat.title} (fork)`,
              }
              saveMessages(fork.id, loadMessages(id) ?? [])
              setThreads((current) => [fork, ...current])
              open(fork.id)
            }}
            mode={mode}
            onModeChange={setMode}
            onNewChat={newChat}
            activityOpen={activityOpen}
            onActivity={toggleActivity}
            user={user}
            userMenu={{
              onSignIn: ({ email }) => setUser({ name: email.split("@")[0] }),
              onLogOut: () => setUser(undefined),
            }}
          />
        }
        right={<AiDebugPanel chatId={activeId ?? draftId} />}
        bottom={<div />}
        headers={{
          left: (
            <HistoryButtons
              canGoBack={history.canGoBack}
              canGoForward={history.canGoForward}
              onBack={history.back}
              onForward={history.forward}
            />
          ),
          main: (
            <MainHeader
              // Keyed so a rename left open doesn't follow you to another chat.
              key={active?.id ?? "new"}
              title={active?.title ?? "New chat"}
              onRename={
                active ? (title) => update(active.id, { title }) : undefined
              }
              onNewChat={newChat}
            />
          ),
          right: "AI requests",
        }}
        headerBorder={{
          left: false,
          main: false,
        }}
      >
        {/* Keyed by id, so a new chat keeps its component, and its stream,
            when its first message turns it into a thread. */}
        {hydrated ? (
          <Chat
            key={activeId ?? draftId}
            id={activeId ?? draftId}
            onFirstMessage={(id, text) => {
              if (chats.some((chat) => chat.id === id)) return
              setThreads((current) => [
                { id, title: titleOf(text) },
                ...current,
              ])
              if (id === draftId) open(id)
            }}
            // A new chat holding the conversation up to a reply, opened
            // straight away, as forking a chat from the sidebar is.
            onBranch={(messages) => {
              const branch = {
                id: crypto.randomUUID(),
                title: `${active?.title ?? "New chat"} (branch)`,
              }
              saveMessages(branch.id, messages)
              setThreads((current) => [branch, ...current])
              open(branch.id)
            }}
          />
        ) : null}
      </Panels>
    </SidebarProvider>
  )
}

export { ChatShell }
