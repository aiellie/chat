"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Cancel01Icon,
  CodeSquareIcon,
  Heading01Icon,
  Heading02Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  MinusSignIcon,
  QuoteDownIcon,
  SourceCodeIcon,
  TextBoldIcon,
  TextIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor as TiptapEditor,
} from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "@tiptap/markdown"

import { floating, paper } from "@/components/ui/surfaces"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import { cn } from "@/lib/utils"

// The written text, drawn like a reply: Geist at 15px, headings by size,
// lists and quotes in the muted ink, code in Geist Mono on a faint fill.
const prose = cn(
  "text-[15px] leading-relaxed text-foreground outline-none",
  "[&_p]:my-2 [&>*:first-child]:mt-0",
  "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:leading-tight [&_h1]:font-medium [&_h1]:tracking-tight",
  "[&_h2]:mt-5 [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:leading-snug [&_h2]:font-medium",
  "[&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-medium",
  "[&_li]:my-0.5 [&_li]:marker:text-muted-foreground [&_li_p]:my-0 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6",
  "[&_blockquote]:my-2 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3.5 [&_blockquote]:text-muted-foreground",
  "[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-foreground/[0.04] [&_pre]:px-3.5 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed dark:[&_pre]:bg-foreground/[0.06]",
  "[&_hr]:my-5 [&_hr]:border-border",
  "[&_a]:underline [&_a]:decoration-muted-foreground [&_a]:underline-offset-3",
  "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
)

// The rows of the slash menu and the floating bar share these commands.
type Block = {
  id: string
  label: string
  icon: IconSvgElement
  /** What to type at the start of a line for the same block. */
  shortcut?: string
  run: (editor: TiptapEditor) => void
  active?: (editor: TiptapEditor) => boolean
}

const BLOCKS: Block[] = [
  {
    id: "text",
    label: "Text",
    icon: TextIcon,
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "heading",
    label: "Heading",
    icon: Heading01Icon,
    shortcut: "#",
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    active: (e) => e.isActive("heading", { level: 1 }),
  },
  {
    id: "subheading",
    label: "Subheading",
    icon: Heading02Icon,
    shortcut: "##",
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    active: (e) => e.isActive("heading", { level: 2 }),
  },
  {
    id: "bulleted-list",
    label: "Bulleted list",
    icon: LeftToRightListBulletIcon,
    shortcut: "-",
    run: (e) => e.chain().focus().toggleBulletList().run(),
    active: (e) => e.isActive("bulletList"),
  },
  {
    id: "numbered-list",
    label: "Numbered list",
    icon: LeftToRightListNumberIcon,
    shortcut: "1.",
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    active: (e) => e.isActive("orderedList"),
  },
  {
    id: "quote",
    label: "Quote",
    icon: QuoteDownIcon,
    shortcut: ">",
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    active: (e) => e.isActive("blockquote"),
  },
  {
    id: "code-block",
    label: "Code block",
    icon: CodeSquareIcon,
    shortcut: "```",
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    icon: MinusSignIcon,
    shortcut: "---",
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
]

type Mark = {
  id: string
  label: string
  icon: IconSvgElement
  shortcut?: string
  run: (editor: TiptapEditor) => void
}

const MARKS: Mark[] = [
  {
    id: "bold",
    label: "Bold",
    icon: TextBoldIcon,
    shortcut: "⌘B",
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    label: "Italic",
    icon: TextItalicIcon,
    shortcut: "⌘I",
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: "strike",
    label: "Strikethrough",
    icon: TextStrikethroughIcon,
    shortcut: "⌘⇧S",
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    id: "code",
    label: "Code",
    icon: SourceCodeIcon,
    shortcut: "⌘E",
    run: (e) => e.chain().focus().toggleCode().run(),
  },
]

// The blocks the floating bar offers, beside the marks.
const BAR_BLOCKS = ["heading", "subheading", "bulleted-list", "quote"].map(
  (id) => BLOCKS.find((block) => block.id === id)!
)

/** A pressed-in fill for a bar button whose mark or block is on. */
const on = "bg-foreground/[0.08] [&_svg]:text-foreground"

/**
 * The bar over a selection: marks, a link, and the common blocks. A link
 * opens in place, as a field for its address.
 */
function FormatBar({
  editor,
  linking,
  onLinking,
}: {
  editor: TiptapEditor
  linking: boolean
  onLinking: (linking: boolean) => void
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      marks: Object.fromEntries(
        MARKS.map((m) => [m.id, editor.isActive(m.id)])
      ),
      blocks: Object.fromEntries(
        BAR_BLOCKS.map((b) => [b.id, b.active?.(editor) ?? false])
      ),
      link: editor.isActive("link"),
      href: (editor.getAttributes("link").href as string | undefined) ?? "",
    }),
  })

  return (
    <BubbleMenu
      editor={editor}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        flip: true,
        shift: { padding: 8 },
      }}
      shouldShow={({ editor, state: view }) =>
        editor.isEditable &&
        !view.selection.empty &&
        !editor.isActive("codeBlock") &&
        !editor.isActive("horizontalRule")
      }
      className={cn(
        floating,
        "z-50 flex h-9 items-center gap-0.5 rounded-xl border-border/40 p-1",
        "animate-in duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] fade-in-0 zoom-in-95 motion-reduce:animate-none"
      )}
    >
      {linking ? (
        <LinkField
          href={state.href}
          onDone={(href) => {
            const chain = editor.chain().focus().extendMarkRange("link")
            if (href) chain.setLink({ href }).run()
            else chain.unsetLink().run()
            onLinking(false)
          }}
          onCancel={() => {
            onLinking(false)
            editor.commands.focus()
          }}
        />
      ) : (
        <div
          role="toolbar"
          aria-label="Format"
          className="flex items-center gap-0.5"
        >
          {MARKS.map((mark) => (
            <TooltipIconButton
              key={mark.id}
              tooltip={mark.label}
              shortcut={mark.shortcut}
              side="top"
              aria-pressed={state.marks[mark.id]}
              className={cn("size-7", state.marks[mark.id] && on)}
              onClick={() => mark.run(editor)}
            >
              <HugeiconsIcon aria-hidden icon={mark.icon} />
            </TooltipIconButton>
          ))}
          <TooltipIconButton
            tooltip={state.link ? "Edit link" : "Link"}
            shortcut="⌘K"
            side="top"
            aria-pressed={state.link}
            className={cn("size-7", state.link && on)}
            onClick={() => onLinking(true)}
          >
            <HugeiconsIcon aria-hidden icon={Link01Icon} />
          </TooltipIconButton>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
          {BAR_BLOCKS.map((block) => (
            <TooltipIconButton
              key={block.id}
              tooltip={block.label}
              side="top"
              aria-pressed={state.blocks[block.id]}
              className={cn("size-7", state.blocks[block.id] && on)}
              onClick={() => block.run(editor)}
            >
              <HugeiconsIcon aria-hidden icon={block.icon} />
            </TooltipIconButton>
          ))}
        </div>
      )}
    </BubbleMenu>
  )
}

/** The link's address, typed in place of the bar. Empty removes the link. */
function LinkField({
  href,
  onDone,
  onCancel,
}: {
  href: string
  onDone: (href: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = React.useState(href)
  const done = () => {
    const trimmed = value.trim()
    // An address without a scheme is a web address.
    onDone(
      trimmed && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed)
        ? `https://${trimmed}`
        : trimmed
    )
  }
  return (
    <form
      className="flex items-center gap-0.5 ps-2"
      onSubmit={(event) => {
        event.preventDefault()
        done()
      }}
    >
      <input
        autoFocus
        aria-label="Link address"
        placeholder="Paste a link"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
          }
        }}
        className="w-56 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <TooltipIconButton
        tooltip={value.trim() ? "Add link" : "Remove link"}
        side="top"
        type="submit"
        className="size-7"
      >
        <HugeiconsIcon aria-hidden icon={Tick02Icon} />
      </TooltipIconButton>
      <TooltipIconButton
        tooltip="Cancel"
        side="top"
        type="button"
        className="size-7"
        onClick={onCancel}
      >
        <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
      </TooltipIconButton>
    </form>
  )
}

/** A "/" being typed: where it starts, and what follows it so far. */
type Slash = { from: number; to: number; query: string }

/**
 * A "/" at the start of a line or after a space, and the word typed after
 * it, just before the caret. Not inside code.
 */
function slashAt(editor: TiptapEditor): Slash | undefined {
  const { selection } = editor.state
  if (
    !selection.empty ||
    editor.isActive("codeBlock") ||
    editor.isActive("code")
  )
    return undefined
  const { $from } = selection
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼")
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(before)
  if (!match) return undefined
  const query = match[1]
  return { from: $from.pos - query.length - 1, to: $from.pos, query }
}

const matches = (query: string) =>
  BLOCKS.filter((block) =>
    block.label.toLowerCase().includes(query.toLowerCase())
  )

/** The list of blocks under a "/", filtered by what's typed after it. */
function SlashMenu({
  editor,
  slash,
  index,
  onIndex,
  onPick,
}: {
  editor: TiptapEditor
  slash: Slash
  index: number
  onIndex: (index: number) => void
  onPick: (block: Block) => void
}) {
  const list = matches(slash.query)
  const caret = editor.view.coordsAtPos(slash.from)
  const height = 300
  const below = caret.bottom + 6 + height < window.innerHeight
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [index])

  return createPortal(
    <div
      ref={listRef}
      data-slot="editor-slash-menu"
      role="listbox"
      aria-label="Insert a block"
      // Picking a row mustn't take focus from the text.
      onMouseDown={(event) => event.preventDefault()}
      style={{
        left: Math.min(caret.left, window.innerWidth - 232),
        ...(below
          ? { top: caret.bottom + 6 }
          : { bottom: window.innerHeight - caret.top + 6 }),
        maxHeight: height,
      }}
      className={cn(
        floating,
        "fixed z-50 w-56 overflow-y-auto rounded-xl border-border/40 p-1",
        "animate-in duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] fade-in-0 zoom-in-95 motion-reduce:animate-none"
      )}
    >
      {list.length === 0 ? (
        <div className="px-2 py-1.5 text-[13px] text-muted-foreground">
          No block called “{slash.query}”
        </div>
      ) : (
        <>
          <div className="px-2 py-1 text-xs text-muted-foreground/70">
            Blocks
          </div>
          {list.map((block, i) => (
            <button
              key={block.id}
              type="button"
              role="option"
              aria-selected={i === index}
              data-index={i}
              data-highlighted={i === index ? "" : undefined}
              onMouseMove={() => i !== index && onIndex(i)}
              onClick={() => onPick(block)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-[13px] text-muted-foreground transition-colors outline-none select-none motion-reduce:transition-none",
                "data-highlighted:bg-foreground/[0.06] data-highlighted:text-foreground dark:data-highlighted:bg-foreground/[0.09]",
                "[&_svg]:size-4"
              )}
            >
              <HugeiconsIcon aria-hidden icon={block.icon} strokeWidth={1.5} />
              {block.label}
              {block.shortcut ? (
                <kbd className="ms-auto font-mono text-[11px] text-muted-foreground/70">
                  {block.shortcut}
                </kbd>
              ) : null}
            </button>
          ))}
        </>
      )}
    </div>,
    document.body
  )
}

const wordsIn = (text: string) => text.match(/\S+/g)?.length ?? 0

/**
 * A rich text editor that reads and writes Markdown. Select text for a bar
 * of marks and blocks, type "/" for a menu of blocks, or start a line with
 * "#", "-", "1." or ">". With `editable` off, it shows the same document
 * without the chrome.
 */
function Editor({
  value = "",
  onChange,
  placeholder = "Write, or type / for blocks",
  editable = true,
  autoFocus = false,
  className,
  "aria-label": ariaLabel = "Editor",
}: {
  /** The document, as Markdown. Changing it from outside replaces it. */
  value?: string
  /** Called with the document as Markdown on every change. */
  onChange?: (markdown: string) => void
  placeholder?: string
  editable?: boolean
  autoFocus?: boolean
  className?: string
  "aria-label"?: string
}) {
  const [slash, setSlash] = React.useState<Slash>()
  const [index, setIndex] = React.useState(0)
  const [linking, setLinking] = React.useState(false)
  // A "/" closed with Escape stays closed until the caret leaves it.
  const dismissed = React.useRef<number | undefined>(undefined)
  // The keyboard handler is set once; it reads the menu through a ref.
  const menu = React.useRef({ slash, index })
  const onChangeRef = React.useRef(onChange)
  const editorRef = React.useRef<TiptapEditor | null>(null)

  const pick = React.useCallback((editor: TiptapEditor, block: Block) => {
    const open = menu.current.slash
    if (open)
      editor.chain().focus().deleteRange({ from: open.from, to: open.to }).run()
    block.run(editor)
    menu.current = { slash: undefined, index: 0 }
    setSlash(undefined)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    autofocus: autoFocus ? "end" : false,
    content: value,
    contentType: "markdown",
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    editorProps: {
      attributes: { "aria-label": ariaLabel, class: prose },
      handleKeyDown: (view, event) => {
        const { slash, index } = menu.current
        const current = editorRef.current
        if ((event.metaKey || event.ctrlKey) && event.key === "k" && current) {
          if (view.state.selection.empty && !current.isActive("link"))
            return false
          event.preventDefault()
          setLinking(true)
          return true
        }
        if (!slash || !current) return false
        const list = matches(slash.query)
        if (event.key === "Escape") {
          dismissed.current = slash.from
          menu.current = { slash: undefined, index: 0 }
          setSlash(undefined)
          return true
        }
        if (!list.length) return false
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const step = event.key === "ArrowDown" ? 1 : -1
          const next = (index + step + list.length) % list.length
          menu.current = { slash, index: next }
          setIndex(next)
          return true
        }
        if (event.key === "Enter" || event.key === "Tab") {
          pick(current, list[Math.min(index, list.length - 1)])
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getMarkdown())
    },
    onTransaction: ({ editor }) => {
      const next = slashAt(editor)
      if (next && dismissed.current === next.from) return setSlash(undefined)
      if (!next) dismissed.current = undefined
      const open = menu.current.slash
      if (next?.query === open?.query && next?.from === open?.from) return
      menu.current = { slash: next, index: 0 }
      setSlash(next)
      setIndex(0)
    },
    onBlur: () => setSlash(undefined),
  })
  React.useLayoutEffect(() => {
    menu.current = { slash, index }
    onChangeRef.current = onChange
    editorRef.current = editor
  })

  const words = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? wordsIn(editor.getText()) : 0),
  })

  // A value set from outside replaces the document, without echoing back.
  React.useEffect(() => {
    if (!editor || editor.getMarkdown() === value) return
    editor.commands.setContent(value, {
      contentType: "markdown",
      emitUpdate: false,
    })
  }, [editor, value])

  React.useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  return (
    <div
      data-slot="editor"
      data-readonly={!editable || undefined}
      className={cn(
        "flex flex-col",
        editable &&
          cn(
            paper,
            "rounded-xl transition-colors duration-150 focus-within:border-ring motion-reduce:transition-none"
          ),
        className
      )}
    >
      <EditorContent
        editor={editor}
        className={cn(
          "min-h-40 flex-1 cursor-text [&_.tiptap]:min-h-full",
          editable ? "px-5 py-4" : "cursor-auto"
        )}
        onClick={() =>
          editable && editor && !editor.isFocused && editor.commands.focus()
        }
      />
      {editable ? (
        <div className="flex justify-end border-t border-border/60 px-4 py-2 text-xs text-muted-foreground tabular-nums">
          {words} {words === 1 ? "word" : "words"}
        </div>
      ) : null}
      {editor && editable ? (
        <FormatBar editor={editor} linking={linking} onLinking={setLinking} />
      ) : null}
      {editor && editable && slash ? (
        <SlashMenu
          editor={editor}
          slash={slash}
          index={index}
          onIndex={setIndex}
          onPick={(block) => pick(editor, block)}
        />
      ) : null}
    </div>
  )
}

export { Editor }
