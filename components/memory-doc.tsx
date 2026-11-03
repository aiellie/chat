"use client"

import * as React from "react"

import { Editor } from "@/components/aiellie/editor"
import {
  applyMemoryChanges,
  listMemories,
  subscribeMemories,
  type Memory,
} from "@/components/memory-store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { changesFrom, memoriesToMarkdown } from "@/lib/memory-document"

// How long after the last keystroke an edit is saved.
const SAVE_AFTER = 600

// Mounted only while the dialog is open, so it starts from the memories as
// they are.
function MemoryDocForm({
  memories,
  onDone,
}: {
  memories: Memory[]
  onDone: () => void
}) {
  // What the editor was last given. Set again only when the memories change
  // under the doc, from a chat or another tab, never from its own saves, so
  // the text doesn't jump while it's being written.
  const [value, setValue] = React.useState(() => memoriesToMarkdown(memories))
  // The doc as written, and the memories it was written from. Edits are
  // worked out against those, so a memory a chat saves meanwhile isn't
  // taken as deleted.
  const doc = React.useRef(value)
  const base = React.useRef(memories)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const save = React.useCallback(async () => {
    clearTimeout(timer.current)
    timer.current = undefined
    await applyMemoryChanges(changesFrom(doc.current, base.current))
    base.current = await listMemories()
    // A memory saved elsewhere while this was being written joins the doc.
    if (!timer.current && hasChanges(doc.current, base.current)) {
      doc.current = memoriesToMarkdown(base.current)
      setValue(doc.current)
    }
  }, [])

  // While nothing is waiting to be saved, the doc follows the memories.
  React.useEffect(
    () =>
      subscribeMemories(async () => {
        if (timer.current) return
        const latest = await listMemories()
        if (timer.current || !hasChanges(doc.current, latest)) return
        base.current = latest
        doc.current = memoriesToMarkdown(latest)
        setValue(doc.current)
      }),
    []
  )

  // Whatever's waiting is saved when the doc closes.
  React.useEffect(
    () => () => {
      if (timer.current) save()
    },
    [save]
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>Memory</DialogTitle>
        <DialogDescription>
          What the AI remembers about you. Each line is one memory, and edits
          save as you type.
        </DialogDescription>
      </DialogHeader>
      <Editor
        aria-label="Memory"
        value={value}
        autoFocus
        placeholder="Write something to remember, one per line"
        className="max-h-[60vh] min-h-0 [&>:first-child]:min-h-0 [&>:first-child]:overflow-y-auto"
        onChange={(markdown) => {
          doc.current = markdown
          clearTimeout(timer.current)
          timer.current = setTimeout(save, SAVE_AFTER)
        }}
      />
      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  )
}

const hasChanges = (markdown: string, memories: Memory[]) => {
  const { create, update, remove } = changesFrom(markdown, memories)
  return create.length + update.length + remove.length > 0
}

/** The Memory doc: every memory as a line, edited in the rich text editor. */
function MemoryDoc({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Read as it opens, so the editor starts from them rather than empty, and
  // dropped as it closes, so the next opening reads them afresh.
  const [memories, setMemories] = React.useState<Memory[]>()
  React.useEffect(() => {
    if (open) listMemories().then(setMemories)
  }, [open])
  const close = (next: boolean) => {
    if (!next) setMemories(undefined)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        {open && memories ? (
          <MemoryDocForm memories={memories} onDone={() => close(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export { MemoryDoc }
