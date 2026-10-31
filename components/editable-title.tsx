"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Enter keeps the new name, Escape and an empty field keep the old one.
function useRenameInput(title: string, onDone: (title?: string) => void) {
  const [value, setValue] = React.useState(title)
  const ref = React.useRef<HTMLInputElement>(null)
  // Escape ends the edit by removing the field, and some browsers report that
  // as a blur, which would otherwise save the name Escape meant to throw away.
  const cancelledRef = React.useRef(false)

  React.useEffect(() => {
    // A frame late on purpose: a menu this was opened from hands focus back to
    // its trigger as it closes, and focus taken before then is lost again.
    const frame = requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return {
    ref,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue(event.target.value),
    onBlur: () => {
      if (!cancelledRef.current) onDone(value.trim() || undefined)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        event.currentTarget.blur()
      } else if (event.key === "Escape") {
        event.preventDefault()
        cancelledRef.current = true
        onDone()
      }
    },
  }
}

function EditableTitleField({
  title,
  label,
  onDone,
}: {
  title: string
  label: string
  onDone: (title?: string) => void
}) {
  return (
    <Input
      {...useRenameInput(title, onDone)}
      data-slot="editable-title-input"
      aria-label={label}
      className="h-7 max-w-72 rounded-md px-2 text-sm font-medium"
    />
  )
}

function EditableTitle({
  title,
  editing,
  onEditingChange,
  onRename,
  label = "Name",
  className,
  render,
  ...props
}: Omit<useRender.ComponentProps<"h1">, "title" | "children"> & {
  title: string
  editing: boolean
  onEditingChange: (editing: boolean) => void
  /** Left out for something that can't be renamed yet, which shows plain text. */
  onRename?: (title: string) => void
  /** What the field is called for screen readers, like "Chat name". */
  label?: string
}) {
  // The field stands in for the heading while it's open, rather than sitting
  // inside it.
  const field =
    onRename && editing ? (
      <EditableTitleField
        title={title}
        label={label}
        onDone={(next) => {
          if (next && next !== title) onRename(next)
          onEditingChange(false)
        }}
      />
    ) : null

  const content = !onRename ? (
    <span className="block truncate px-1">{title}</span>
  ) : (
    <button
      type="button"
      title="Rename"
      onClick={() => onEditingChange(true)}
      className="flex h-7 max-w-full min-w-0 items-center rounded-md border border-transparent px-2 font-medium transition-colors duration-80 outline-none hover:bg-accent focus-visible:border-ring motion-reduce:transition-none"
    >
      <span className="truncate">{title}</span>
    </button>
  )

  const heading = useRender({
    defaultTagName: "h1",
    props: mergeProps<"h1">(
      {
        className: cn("min-w-0 text-sm font-medium", className),
        children: content,
      },
      props
    ),
    render,
    state: { slot: "editable-title" },
  })

  return field ?? heading
}

export { EditableTitle, useRenameInput }
