"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { Chat, threadMessages } from "@/components/aiellie/chat"
import { ChatSidebar } from "@/components/chat-sidebar"
import type { ChatMode } from "@/components/chat-switcher"
import type { ChatNavChat } from "@/components/nav-chats"
import type { User } from "@/components/nav-user"
import { Panels } from "@/components/panels"
import { SidebarProvider } from "@/components/ui/sidebar"

// The first line of the first message, cut to fit the sidebar.
function titleOf(text: string) {
  const line = text.trim().split("\n")[0]
  return line.length > 80 ? `${line.slice(0, 80)}…` : line
}

function ChatShell() {
  const [chats, setChats] = React.useState<ChatNavChat[]>([])
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
    setChats((current) =>
      current.map((chat) => (chat.id === id ? { ...chat, ...change } : chat))
    )
  const remove = (id: string) => {
    setChats((current) => current.filter((chat) => chat.id !== id))
    threadMessages.delete(id)
    if (activeId === id) open(null)
  }

  const toggleActivity = () => setActivityOpen((open) => !open)

  const active = chats.find((chat) => chat.id === activeId)

  return (
    // `contents`, so the wrapper only carries the sidebar's context and sizes
    // while the panels lay out the page.
    <SidebarProvider className="contents">
      <Panels
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
              threadMessages.set(fork.id, threadMessages.get(id) ?? [])
              setChats((current) => [fork, ...current])
              open(fork.id)
            }}
            mode={mode}
            onModeChange={setMode}
            onNewChat={() => {
              setDraftId(crypto.randomUUID())
              open(null)
            }}
            activityOpen={activityOpen}
            onActivity={toggleActivity}
            user={user}
            userMenu={{
              onSignIn: ({ email }) => setUser({ name: email.split("@")[0] }),
              onLogOut: () => setUser(undefined),
            }}
          />
        }
        right={<div />}
        bottom={<div />}
        headers={{
          left: null,
          main: active?.title ?? "New chat",
        }}
        headerBorder={{
          left: false,
          main: false,
        }}
      >
        {/* Keyed by id, so a new chat keeps its component, and its stream,
            when its first message turns it into a thread. */}
        <Chat
          key={activeId ?? draftId}
          id={activeId ?? draftId}
          onFirstMessage={(id, text) => {
            if (chats.some((chat) => chat.id === id)) return
            setChats((current) => [{ id, title: titleOf(text) }, ...current])
            if (id === draftId) open(id)
          }}
        />
      </Panels>
    </SidebarProvider>
  )
}

export { ChatShell }
