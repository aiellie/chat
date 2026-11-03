"use client"

import * as React from "react"
import {
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  createMemory,
  deleteMemory,
  updateMemory,
  type Memory,
} from "@/components/memory-store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { Textarea } from "@/components/ui/textarea"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

// Mounted only while the dialog is open, so it starts from the memory, or
// empty for a new one.
function MemoryForm({
  memory,
  onDone,
}: {
  memory?: Memory
  onDone: () => void
}) {
  const [text, setText] = React.useState(memory?.text ?? "")
  const [saving, setSaving] = React.useState(false)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!text.trim() || saving) return
        setSaving(true)
        if (memory) await updateMemory(memory.id, text)
        else await createMemory({ text, savedBy: "you" })
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>{memory ? "Edit memory" : "Add memory"}</DialogTitle>
        <DialogDescription>
          A fact about you for later chats, saved in this browser.
        </DialogDescription>
      </DialogHeader>
      <Textarea
        autoFocus
        rows={3}
        aria-label="Memory"
        value={text}
        onChange={(event) => setText(event.target.value)}
        // A memory is a line or two, so Enter saves it; Shift+Enter breaks
        // the line.
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return
          event.preventDefault()
          event.currentTarget.form?.requestSubmit()
        }}
        placeholder="Takes their coffee black"
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!text.trim() || saving}>
          {memory ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Adds a memory, or edits one when given it. */
function MemoryDialog({
  open,
  onOpenChange,
  memory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  memory?: Memory
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <MemoryForm memory={memory} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * A memory's more button, on its row: edit it, or delete it once the person
 * confirms, since that can't be undone. Editing is open while `editing`, so
 * the row can open it from its text too.
 */
function MemoryActions({
  memory,
  editing,
  onEditingChange: setEditing,
}: {
  memory: Memory
  editing: boolean
  onEditingChange: (editing: boolean) => void
}) {
  const [deleting, setDeleting] = React.useState(false)

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <TooltipIconButton
              tooltip="More"
              side="left"
              // Shows as the row is hovered, and always on touch, where
              // nothing hovers. It stays while focused or its menu is open.
              className="opacity-0 transition-[opacity,scale] group-focus-within/item:opacity-100 group-hover/item:opacity-100 data-popup-open:bg-muted data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
            />
          }
        >
          <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
        </MenuTrigger>
        <MenuContent side="bottom" align="end">
          <MenuItem onClick={() => setEditing(true)}>
            <HugeiconsIcon aria-hidden icon={PencilEdit02Icon} />
            Edit
          </MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <HugeiconsIcon aria-hidden icon={Delete02Icon} />
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>
      <MemoryDialog open={editing} onOpenChange={setEditing} memory={memory} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              Later chats won&apos;t know “{memory.text}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={async () => {
                await deleteMemory(memory.id)
                setDeleting(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { MemoryActions, MemoryDialog }
