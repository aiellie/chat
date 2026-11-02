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
  createProject,
  deleteProject,
  updateProject,
  type Project,
} from "@/components/projects-store"
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

// Mounted only while the dialog is open, so it starts from the project, or
// empty for a new one.
function ProjectForm({
  project,
  onDone,
}: {
  project?: Project
  onDone: () => void
}) {
  const [name, setName] = React.useState(project?.name ?? "")
  const [description, setDescription] = React.useState(
    project?.description ?? ""
  )
  const [icon, setIcon] = React.useState(project?.icon)
  const [color, setColor] = React.useState(project?.color)
  const [saving, setSaving] = React.useState(false)
  const id = React.useId()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!name.trim() || saving) return
        setSaving(true)
        const input = { name, description, icon, color }
        if (project) await updateProject(project.id, input)
        else await createProject(input)
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>{project ? "Edit project" : "Create project"}</DialogTitle>
        <DialogDescription>
          Projects are saved in this browser.
        </DialogDescription>
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
            placeholder="Growth campaign"
            className="h-9"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          Description{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id={`${id}-description`}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What it's for"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || saving}>
          {project ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Creates a project, or edits one when given it. */
function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <ProjectForm project={project} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * A project's more button, on its row: edit it, or delete it once the person
 * confirms, since that can't be undone.
 */
function ProjectActions({ project }: { project: Project }) {
  const [editing, setEditing] = React.useState(false)
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
      <ProjectDialog
        open={editing}
        onOpenChange={setEditing}
        project={project}
      />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
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
                await deleteProject(project.id)
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

export { ProjectActions, ProjectDialog }
