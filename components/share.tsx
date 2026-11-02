"use client"

import * as React from "react"
import {
  ArrowUpRight01Icon,
  Copy01Icon,
  Share08Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { UIMessage } from "ai"
import Link from "next/link"
import { z } from "zod"

import { AttachmentGroup } from "@/components/aiellie/attachment"
import { Bubble, BubbleContent } from "@/components/aiellie/bubble"
import {
  ChatEmpty,
  ChatEmptyDescription,
  ChatEmptyTitle,
} from "@/components/aiellie/chat-empty"
import { FileAttachment } from "@/components/aiellie/file-attachment"

import { Message, MessageContent } from "@/components/aiellie/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/aiellie/message-scroller"
// Renamed, as this file also uses fetch's Response to pack the link.
import { Response as Reply } from "@/components/aiellie/response"
import { Thread } from "@/components/aiellie/thread"
import { loadMessages } from "@/components/thread-store"
import { citedFirst, searchesIn } from "@/components/aiellie/web-search"
import type { ChatNavChat } from "@/components/nav-chats"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MessageMetadata } from "@/lib/model-messages"

// A link opens whatever it holds, so what comes out of one is checked before
// it's shown: only these parts, and only web pages for sources.
const sharedChatSchema = z.object({
  title: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      metadata: z.object({ createdAt: z.number() }).optional(),
      parts: z.array(
        z.discriminatedUnion("type", [
          z.object({ type: z.literal("text"), text: z.string() }),
          z.object({
            type: z.literal("file"),
            mediaType: z.string(),
            filename: z.string().optional(),
            url: z.literal(""),
          }),
          z.object({
            type: z.literal("source-url"),
            sourceId: z.string(),
            url: z.url({ protocol: /^https?$/ }),
            title: z.string().optional(),
          }),
        ])
      ),
    })
  ),
})

type SharedChat = z.infer<typeof sharedChatSchema>

type SharedMessage = SharedChat["messages"][number]

// What a shared chat holds: the words, the files' names and the pages a reply
// drew on. Thinking, ratings and the searches themselves stay behind, which
// keeps the link short and leaves out what was only for the person.
function snapshotOf(title: string, messages: UIMessage[]): SharedChat {
  return {
    title,
    messages: messages.flatMap<SharedMessage>((message, index) => {
      if (message.role === "system") return []
      const createdAt = (message.metadata as MessageMetadata | undefined)
        ?.createdAt
      const parts: SharedMessage["parts"] = [
        ...message.parts.flatMap<SharedMessage["parts"][number]>((part) =>
          part.type === "text"
            ? [{ type: "text", text: part.text }]
            : part.type === "file"
              ? [
                  {
                    type: "file",
                    mediaType: part.mediaType,
                    filename: part.filename,
                    url: "",
                  },
                ]
              : []
        ),
        ...(message.role === "assistant"
          ? searchesIn(message).found.map((page, index) => ({
              type: "source-url" as const,
              sourceId: String(index),
              url: page.url,
              title: page.title,
            }))
          : []),
      ]
      if (parts.length === 0) return []
      return [
        {
          id: String(index),
          role: message.role,
          ...(createdAt !== undefined ? { metadata: { createdAt } } : {}),
          parts,
        },
      ]
    }),
  }
}

// The chat goes in the link itself, squeezed and written in URL-safe base64,
// after the #, so it's never sent to a server and needs none to keep it.
async function encodeSharedChat(chat: SharedChat) {
  const stream = new Blob([JSON.stringify(chat)])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** The chat a link holds, or nothing if it holds none, or a broken one. */
async function decodeSharedChat(data: string) {
  try {
    const binary = atob(data.replace(/-/g, "+").replace(/_/g, "/"))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"))
    const json: unknown = JSON.parse(await new Response(stream).text())
    return sharedChatSchema.parse(json)
  } catch {
    return null
  }
}

// The chat as it will be shared, small and still: a look, not a place to act,
// though it scrolls, with the thread's own button to jump to the end. It
// opens at the start, under its title, so it reads from the top.
function SharePreview({ chat }: { chat: SharedChat }) {
  return (
    <MessageScrollerProvider defaultScrollPosition="start">
      <MessageScroller className="h-72 rounded-lg border border-border/60 bg-background pb-0">
        <div className="absolute inset-x-0 top-0 z-10 truncate border-b border-border/60 bg-popover px-3 py-2 text-xs font-medium backdrop-blur-xs supports-[backdrop-filter]:bg-background/60">
          {chat.title}
        </div>
        <MessageScrollerViewport
          role="region"
          aria-label="Preview"
          tabIndex={0}
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageScrollerContent
            inert
            className="[zoom:0.85] gap-4 px-4 pt-12 pb-4"
          >
            {chat.messages.map((message) => {
              const mine = message.role === "user"
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")
              const files = message.parts.filter((part) => part.type === "file")
              const sources = mine
                ? []
                : citedFirst(searchesIn(message as UIMessage).found, text)
              return (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align={mine ? "end" : "start"}>
                    <MessageContent>
                      {files.length > 0 ? (
                        <AttachmentGroup className="max-w-full">
                          {files.map((file, index) => (
                            <FileAttachment
                              key={index}
                              name={file.filename ?? "File"}
                              mediaType={file.mediaType}
                            />
                          ))}
                        </AttachmentGroup>
                      ) : null}
                      {text ? (
                        <Bubble variant={mine ? "secondary" : "ghost"}>
                          <BubbleContent
                            className={mine ? "whitespace-pre-wrap" : undefined}
                          >
                            {mine ? (
                              text
                            ) : (
                              <Reply
                                citations={sources.map((page) => ({
                                  url: page.url,
                                  title: page.title,
                                }))}
                              >
                                {text}
                              </Reply>
                            )}
                          </BubbleContent>
                        </Bubble>
                      ) : null}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

// Mounted only while the dialog is open, so each opening shares the chat as
// it is then.
function ShareChat({ chat }: { chat: ChatNavChat }) {
  const [shared] = React.useState(() =>
    snapshotOf(chat.title, loadMessages(chat.id) ?? [])
  )
  const [link, setLink] = React.useState<string>()
  const [copied, setCopied] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const empty = shared.messages.length === 0

  React.useEffect(() => {
    if (empty) return
    let current = true
    encodeSharedChat(shared).then((data) => {
      if (current) setLink(`${window.location.origin}/share#${data}`)
    })
    return () => {
      current = false
    }
  }, [shared, empty])

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Share chat</DialogTitle>
        <DialogDescription>
          Anyone with the link can read this chat as it is now. Later messages
          aren&apos;t included, and files are shared by name only.
        </DialogDescription>
      </DialogHeader>
      {empty ? (
        <p className="rounded-lg border border-border/60 px-3 py-8 text-center text-sm text-muted-foreground">
          Nothing to share yet.
        </p>
      ) : (
        <SharePreview chat={shared} />
      )}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          readOnly
          value={link ?? ""}
          placeholder={empty ? undefined : "Making the link…"}
          aria-label="Link"
          disabled={empty}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 font-mono text-xs md:text-xs"
        />
        {link ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open in a new tab"
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon",
                  })}
                />
              }
            >
              <HugeiconsIcon aria-hidden icon={ArrowUpRight01Icon} />
            </TooltipTrigger>
            <TooltipContent>Open in a new tab</TooltipContent>
          </Tooltip>
        ) : null}
        <Button
          disabled={!link}
          onClick={() => {
            if (!link) return
            navigator.clipboard
              .writeText(link)
              .then(() => setCopied(true))
              // Without the clipboard, the link is selected to copy by hand.
              .catch(() => inputRef.current?.select())
          }}
          className="w-28"
        >
          <HugeiconsIcon aria-hidden icon={copied ? Tick02Icon : Copy01Icon} />
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </>
  )
}

/** Shows a chat as it will be shared, and the link that opens it for anyone. */
function ShareDialog({
  open,
  onOpenChange,
  chat,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The chat to share. Kept while the dialog closes, so it doesn't empty. */
  chat?: ChatNavChat
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {chat ? <ShareChat key={chat.id} chat={chat} /> : null}
      </DialogContent>
    </Dialog>
  )
}

/** The chat header's way into sharing. */
function ShareButton(
  props: Omit<React.ComponentProps<typeof Button>, "children">
) {
  return (
    <Button
      variant="ghost"
      size="sm"
      {...props}
      className="text-muted-foreground hover:text-foreground"
    >
      <HugeiconsIcon aria-hidden icon={Share08Icon} />
      Share
    </Button>
  )
}

// Read from the page's #, on load and whenever it changes. Undefined while
// it's being read, null if it holds no chat.
function useSharedChat() {
  const [chat, setChat] = React.useState<SharedChat | null>()

  React.useEffect(() => {
    let latest = 0
    const read = () => {
      const run = ++latest
      decodeSharedChat(window.location.hash.slice(1)).then((chat) => {
        if (run === latest) setChat(chat)
      })
    }
    read()
    window.addEventListener("hashchange", read)
    return () => window.removeEventListener("hashchange", read)
  }, [])

  React.useEffect(() => {
    if (chat) document.title = chat.title
  }, [chat])

  return chat
}

/** A chat opened from a share link: read-only, under a header of its own. */
function SharedChatView() {
  const chat = useSharedChat()

  return (
    // The header is glass over the thread, as the chat's own is.
    <div className="relative isolate flex h-svh flex-col">
      <header className="absolute inset-x-0 top-0 z-20 flex h-10 items-center gap-2 bg-popover px-3 backdrop-blur-xs supports-[backdrop-filter]:bg-background/60">
        <span className="min-w-0 truncate font-medium">{chat?.title}</span>
        {chat ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            Shared chat
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/" />}
          className="ms-auto"
        >
          Start a chat
        </Button>
      </header>
      {chat ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <Thread messages={chat.messages} />
        </div>
      ) : chat === null ? (
        <ChatEmpty>
          <ChatEmptyTitle>This link doesn&apos;t open a chat</ChatEmptyTitle>
          <ChatEmptyDescription>
            It may have been cut short when it was copied. Ask for it again.
          </ChatEmptyDescription>
        </ChatEmpty>
      ) : null}
    </div>
  )
}

export { ShareButton, ShareDialog, SharedChatView }
export type { SharedChat }
