"use client"

import * as React from "react"
import { Autocomplete } from "@base-ui/react/autocomplete"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"

import { loadMessages } from "@/components/thread-store"
import type { ChatNavChat } from "@/components/nav-chats"
import { usePanels } from "@/components/panels"
import { Dialog, DialogContent } from "@/components/ui/dialog"

/** A chat that matched, with the bit of a message that did if it was one. */
type ChatSearchResult = { chat: ChatNavChat; snippet?: string }

type ChatSearchGroup = { value: string; items: ChatSearchResult[] }

// How many chats show before anything is typed.
const RECENT = 8

const kbd =
  "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-sm border border-border/60 px-1 font-sans text-[0.625rem]"

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// A message's words as they read, without the markdown around them, so a
// search for "bold" finds "**bold**" and the snippet doesn't show the stars.
function textOf(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*|__|`+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Every chat's messages, read as the dialog opens rather than on every key:
// each one is its own localStorage entry to parse.
function readTexts(chats: ChatNavChat[]) {
  return new Map(
    chats.map((chat) => [
      chat.id,
      (loadMessages(chat.id) ?? []).map(textOf).filter(Boolean),
    ])
  )
}

// The match with some of what's around it, starting on a whole word.
function snippetOf(text: string, pattern: RegExp) {
  const index = text.search(pattern)
  if (index < 0) return undefined
  let start = Math.max(0, index - 40)
  if (start > 0) start = text.indexOf(" ", start) + 1 || start
  if (start > index) start = index
  const end = Math.min(text.length, index + 160)
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`
}

// Each word of the query on its own, and all of them together for marking
// them up, longest first so "lisbon" wins over "lis".
function patternsOf(query: string) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  const escaped = words.map(escape).sort((a, b) => b.length - a.length)
  return {
    words: escaped.map((word) => new RegExp(word, "i")),
    any: new RegExp(`(${escaped.join("|")})`, "i"),
  }
}

type ChatSearchPatterns = NonNullable<ReturnType<typeof patternsOf>>

// A chat matches when every word turns up in it, in the title or any message.
// Chats with every word in the title come first, then the rest, each in the
// order the sidebar lists them.
function search(
  chats: ChatNavChat[],
  texts: Map<string, string[]>,
  patterns: ChatSearchPatterns | null
): ChatSearchGroup[] {
  if (!patterns) {
    const recent = chats.slice(0, RECENT).map((chat) => ({ chat }))
    return recent.length > 0 ? [{ value: "Recent", items: recent }] : []
  }
  const { words, any } = patterns
  const titled: ChatSearchResult[] = []
  const mentioned: ChatSearchResult[] = []
  for (const chat of chats) {
    const messages = texts.get(chat.id) ?? []
    const inTitle = words.filter((word) => word.test(chat.title))
    const found = words.every(
      (word) =>
        inTitle.includes(word) || messages.some((text) => word.test(text))
    )
    if (!found) continue
    // A word the title lacks counts twice, so the snippet shows where it is.
    let best: string | undefined
    let most = 0
    for (const text of messages) {
      const count = words
        .filter((word) => word.test(text))
        .reduce((sum, word) => sum + (inTitle.includes(word) ? 1 : 2), 0)
      if (count > most) [best, most] = [text, count]
    }
    const snippet = best ? snippetOf(best, any) : undefined
    if (inTitle.length === words.length) titled.push({ chat, snippet })
    else mentioned.push({ chat, snippet })
  }
  return [
    { value: "Titles", items: titled },
    { value: "Messages", items: mentioned },
  ].filter((group) => group.items.length > 0)
}

// Splitting on a capturing pattern leaves every match at an odd index.
function Highlight({
  text,
  pattern,
}: {
  text: string
  pattern: RegExp | null
}) {
  if (!pattern) return text
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={index}
        className="rounded-[0.2rem] bg-foreground/10 text-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// Mounted only while the dialog is open, so each opening starts empty and
// reads the chats afresh.
function ChatSearchPalette({
  chats,
  onSelect,
}: {
  chats: ChatNavChat[]
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [texts] = React.useState(() => readTexts(chats))
  const hintId = React.useId()

  const trimmed = query.trim()
  const patterns = patternsOf(query)
  const pattern = patterns?.any ?? null
  const groups = search(chats, texts, patterns)

  return (
    <Autocomplete.Root
      open
      inline
      items={groups}
      // The groups are already what matched.
      filter={null}
      value={query}
      onValueChange={setQuery}
      itemToStringValue={(result: ChatSearchResult) => result.chat.title}
      autoHighlight="always"
      keepHighlight
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <HugeiconsIcon
          aria-hidden
          icon={Search01Icon}
          strokeWidth={1.5}
          className="size-4 shrink-0 text-muted-foreground/70"
        />
        <Autocomplete.Input
          aria-label="Search chats"
          aria-describedby={hintId}
          placeholder="Search chats"
          spellCheck={false}
          className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 pointer-coarse:text-base"
        />
      </div>
      <div className="min-h-0 flex-1 [scroll-padding-block:0.25rem] overflow-y-auto overscroll-contain p-1">
        <Autocomplete.Empty>
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {chats.length === 0
              ? "No chats yet"
              : `No chats match “${trimmed}”`}
          </p>
        </Autocomplete.Empty>
        <Autocomplete.List>
          {(group: ChatSearchGroup) => (
            <Autocomplete.Group
              key={group.value}
              items={group.items}
              className="not-first:mt-1"
            >
              <Autocomplete.GroupLabel className="px-2 pt-1.5 pb-1 text-xs text-muted-foreground/70 select-none">
                {group.value}
              </Autocomplete.GroupLabel>
              <Autocomplete.Collection>
                {(result: ChatSearchResult) => (
                  <Autocomplete.Item
                    key={result.chat.id}
                    value={result}
                    onClick={() => onSelect(result.chat.id)}
                    className="flex cursor-pointer [scroll-margin-block:0.25rem] flex-col gap-0.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors outline-none select-none data-highlighted:bg-foreground/[0.06] data-highlighted:text-foreground motion-reduce:transition-none dark:data-highlighted:bg-foreground/[0.09]"
                  >
                    <span className="truncate">
                      <Highlight text={result.chat.title} pattern={pattern} />
                    </span>
                    {result.snippet ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground/80">
                        <Highlight text={result.snippet} pattern={pattern} />
                      </span>
                    ) : null}
                  </Autocomplete.Item>
                )}
              </Autocomplete.Collection>
            </Autocomplete.Group>
          )}
        </Autocomplete.List>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground/70 pointer-coarse:hidden">
        <span id={hintId} className="sr-only">
          Use the arrow keys to move between chats, and Enter to open one.
        </span>
        <span aria-hidden className="flex items-center gap-1">
          <kbd className={kbd}>↑</kbd>
          <kbd className={kbd}>↓</kbd>
          to move
        </span>
        <span aria-hidden className="flex items-center gap-1">
          <kbd className={kbd}>↵</kbd>
          to open
        </span>
        <span aria-hidden className="ms-auto flex items-center gap-1">
          <kbd className={kbd}>esc</kbd>
          to close
        </span>
      </div>
    </Autocomplete.Root>
  )
}

/** Finds a chat by its title or by anything said in it. ⌘K opens and closes it. */
function ChatSearch({
  open,
  onOpenChange,
  chats,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chats: ChatNavChat[]
  onSelect: (id: string) => void
}) {
  const { closeSheet } = usePanels()

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return
      // Some keydowns carry no key, such as the ones autofill sends.
      if (event.key?.toLowerCase() !== "k") return
      event.preventDefault()
      onOpenChange(!open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-label="Search chats"
        // Held near the top, so the box stays put as the results come and go.
        className="top-[12vh] flex max-h-[min(32rem,76vh)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <ChatSearchPalette
          chats={chats}
          onSelect={(id) => {
            onSelect(id)
            onOpenChange(false)
            closeSheet()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

export { ChatSearch }
