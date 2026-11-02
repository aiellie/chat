"use client"

import * as React from "react"
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ProjectActions, ProjectDialog } from "@/components/project-dialog"
import { ProjectTile } from "@/components/project-icon"
import {
  listProjects,
  subscribeProjects,
  type Project,
} from "@/components/projects-store"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" })

// Whether a project has every word searched for, in its name or description.
function matches(project: Project, query: string) {
  const text = [project.name, project.description ?? ""].join(" ").toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The title opens the project to edit, and stretches over the whole row so the
// row opens it too. The row's own buttons sit above it.
const rowTrigger =
  "text-start outline-none after:absolute after:-inset-px after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
const row = "relative hover:bg-muted/50"

function ProjectRow({ project }: { project: Project }) {
  const [editing, setEditing] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemMedia variant="icon">
        <ProjectTile icon={project.icon} color={project.color} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>
          <button
            type="button"
            className={rowTrigger}
            onClick={() => setEditing(true)}
          >
            {project.name}
          </button>
        </ItemTitle>
        <ItemDescription>
          {project.description ?? `Created ${day.format(project.createdAt)}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10">
        <ProjectActions
          project={project}
          editing={editing}
          onEditingChange={setEditing}
        />
      </ItemActions>
    </Item>
  )
}

// The person's projects, from components/projects-store.ts. It sits in the
// shell from the layout, in the chat's place.
export default function ProjectsPage() {
  // Undefined until the store answers.
  const [projects, setProjects] = React.useState<Project[]>()
  const [creating, setCreating] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)

  // Loaded, then again whenever they change, here or in another tab.
  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      listProjects().then((list) => {
        if (!cancelled) setProjects(list)
      })
    load()
    const stop = subscribeProjects(load)
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const shown = projects?.filter((project) => matches(project, query)) ?? []

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Projects</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground">
                Saved in this browser, so they don&apos;t follow you to another
                one.
              </p>
            </div>
            <Button className="shrink-0" onClick={() => setCreating(true)}>
              <HugeiconsIcon aria-hidden icon={Add01Icon} />
              Add
            </Button>
          </div>
          {/* Only once there's something to search. */}
          {projects?.length ? (
            <InputGroup className="h-9 rounded-full">
              <InputGroupAddon>
                <HugeiconsIcon aria-hidden icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                ref={search}
                type="text"
                aria-label="Search projects"
                placeholder="Search projects"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault()
                    setQuery("")
                  }
                }}
              />
              {/* Disabled rather than hidden while empty, so the end of the
                  field doesn't shift. Clearing puts focus back in it. */}
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  disabled={!query}
                  onClick={clear}
                  className="rounded-full disabled:opacity-30"
                >
                  <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : null}
        </header>
        {projects === undefined ? null : projects.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            No projects yet.
          </p>
        ) : shown.length > 0 ? (
          <ItemGroup
            aria-label="Projects"
            className="grid gap-x-6 sm:grid-cols-2"
          >
            {shown.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ItemGroup>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No projects match “{query.trim()}”.
          </p>
        )}
      </div>
      <ProjectDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
