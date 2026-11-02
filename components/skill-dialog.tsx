"use client"

import * as React from "react"
import {
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ProjectIconPicker } from "@/components/project-icon"
import {
  createSkill,
  deleteSkill,
  updateSkill,
  type Skill,
} from "@/components/skills-store"
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
import { Input } from "@/components/ui/input"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { Textarea } from "@/components/ui/textarea"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

// Mounted only while the dialog is open, so it starts from the skill, or
// empty for a new one.
function SkillForm({ skill, onDone }: { skill?: Skill; onDone: () => void }) {
  const [name, setName] = React.useState(skill?.name ?? "")
  const [description, setDescription] = React.useState(skill?.description ?? "")
  const [instructions, setInstructions] = React.useState(
    skill?.instructions ?? ""
  )
  const [icon, setIcon] = React.useState(skill?.icon)
  const [color, setColor] = React.useState(skill?.color)
  const [saving, setSaving] = React.useState(false)
  const id = React.useId()
  const ready = name.trim() !== "" && instructions.trim() !== ""

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!ready || saving) return
        setSaving(true)
        const input = { name, description, instructions, icon, color }
        if (skill) await updateSkill(skill.id, input)
        else await createSkill(input)
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>{skill ? "Edit skill" : "Add skill"}</DialogTitle>
        <DialogDescription>Skills are saved in this browser.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          Name
        </label>
        {/* The tile picks the icon and colour, beside the name it marks. */}
        <div className="flex items-center gap-2">
          <ProjectIconPicker
            icon={icon}
            color={color}
            onIconChange={setIcon}
            onColorChange={setColor}
          />
          <Input
            id={`${id}-name`}
            autoFocus
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Brand voice"
            className="h-9"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          Description{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id={`${id}-description`}
          autoComplete="off"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Writes in the brand's tone"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-instructions`} className="text-sm font-medium">
          Instructions
        </label>
        <Textarea
          id={`${id}-instructions`}
          rows={8}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="What the model should do, in Markdown"
          className="max-h-[50vh]"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready || saving}>
          {skill ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Adds a skill, or edits one when given it. */
function SkillDialog({
  open,
  onOpenChange,
  skill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill?: Skill
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <SkillForm skill={skill} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * A skill's more button, on its row: edit it, or delete it once the person
 * confirms, since that can't be undone. Editing is open while `editing`, so
 * the row can open it from its title too.
 */
function SkillActions({
  skill,
  editing,
  onEditingChange: setEditing,
}: {
  skill: Skill
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
      <SkillDialog open={editing} onOpenChange={setEditing} skill={skill} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{skill.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;s removed from this browser for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              onClick={async () => {
                await deleteSkill(skill.id)
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

export { SkillActions, SkillDialog }
