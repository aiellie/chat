"use client"

import * as React from "react"
import { Logout02Icon, SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { signOut } from "@/app/actions"
import { Panels, usePanels } from "@/components/panels"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { SAMPLE_CONVERSATIONS, type Conversation } from "./sample-conversations"

function ConversationList({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const { closeSheet } = usePanels()
  return (
    <nav aria-label="Conversations" className="flex flex-col gap-0.5 p-2">
      {conversations.map((conversation) => {
        const last = conversation.messages.at(-1)
        const active = conversation.id === activeId
        return (
          <button
            key={conversation.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onSelect(conversation.id)
              closeSheet()
            }}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-muted"
            )}
          >
            <span className="w-full truncate text-sm font-medium">
              {conversation.title}
            </span>
            {last ? (
              <span className="w-full truncate text-xs text-muted-foreground">
                {last.author}: {last.text}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function SignOutButton({ name }: { name: string }) {
  return (
    <form action={signOut}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              className="[&_svg]:text-muted-foreground hover:[&_svg]:text-foreground"
            />
          }
        >
          <HugeiconsIcon icon={Logout02Icon} aria-hidden />
          <span className="sr-only">Sign out</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Sign out {name}</TooltipContent>
      </Tooltip>
    </form>
  )
}

function ConversationView({
  conversation,
  name,
  onSend,
}: {
  conversation: Conversation
  name: string
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = React.useState("")
  const send = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {conversation.messages.map((message) => {
          const mine = message.author === name
          return (
            <li
              key={message.id}
              className={cn(
                "flex max-w-[75%] flex-col items-start gap-0.5",
                mine && "items-end self-end"
              )}
            >
              <span className="px-1 text-xs text-muted-foreground">
                {mine ? "You" : message.author}
              </span>
              <p
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {message.text}
              </p>
            </li>
          )
        })}
      </ol>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
        className="flex shrink-0 items-center gap-2 border-t p-3"
      >
        <label htmlFor="composer" className="sr-only">
          Message {conversation.title}
        </label>
        <input
          id="composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${conversation.title}`}
          autoComplete="off"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <Button type="submit" size="icon-lg" disabled={!draft.trim()}>
          <HugeiconsIcon icon={SentIcon} aria-hidden />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}

function ChatHome({ name }: { name: string }) {
  const [conversations, setConversations] = React.useState(SAMPLE_CONVERSATIONS)
  const [activeId, setActiveId] = React.useState(conversations[0].id)
  const active =
    conversations.find((conversation) => conversation.id === activeId) ??
    conversations[0]

  // Messages only live in memory for now; a reload starts over.
  const send = (text: string) =>
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                { id: crypto.randomUUID(), author: name, text },
              ],
            }
          : conversation
      )
    )

  return (
    <Panels
      left={
        <ConversationList
          conversations={conversations}
          activeId={active.id}
          onSelect={setActiveId}
        />
      }
      headers={{
        left: (
          <>
            <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium text-muted-foreground">
              {name}
            </span>
            <SignOutButton name={name} />
          </>
        ),
        main: (
          <span className="min-w-0 truncate px-1 text-xs font-medium">
            {active.title}
          </span>
        ),
      }}
      headerBorder={{ left: false }}
    >
      <ConversationView
        key={active.id}
        conversation={active}
        name={name}
        onSend={send}
      />
    </Panels>
  )
}

export { ChatHome }
