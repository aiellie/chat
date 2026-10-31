"use client"

import * as React from "react"

import { ChatSidebar } from "@/components/chat-sidebar"
import type { ChatMode } from "@/components/chat-switcher"
import type { ChatNavChat } from "@/components/nav-chats"
import type { User } from "@/components/nav-user"
import { Panels } from "@/components/panels"
import { SidebarProvider } from "@/components/ui/sidebar"

function ChatShell() {
  const [chats, setChats] = React.useState<ChatNavChat[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<ChatMode>("chat")
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [user, setUser] = React.useState<User>()

  const update = (id: string, change: Partial<ChatNavChat>) =>
    setChats((current) =>
      current.map((chat) => (chat.id === id ? { ...chat, ...change } : chat))
    )
  const remove = (id: string) => {
    setChats((current) => current.filter((chat) => chat.id !== id))
    if (activeId === id) setActiveId(null)
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
              setActiveId(id)
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
              setChats((current) => [fork, ...current])
              setActiveId(fork.id)
            }}
            mode={mode}
            onModeChange={setMode}
            onNewChat={() => setActiveId(null)}
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
        {null}
      </Panels>
    </SidebarProvider>
  )
}

export { ChatShell }
