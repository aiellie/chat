"use client"

import * as React from "react"
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { SkillActions, SkillDialog } from "@/components/skill-dialog"
import { ProjectTile } from "@/components/project-icon"
import {
  listSkills,
  subscribeSkills,
  type Skill,
} from "@/components/skills-store"
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

// The first line of the instructions, without its Markdown marks, for a
// skill with no description.
const firstLine = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/^[#>*\-\s]+/, "").trim())
    .find(Boolean) ?? ""

// Whether a skill has every word searched for, in its name, description or
// instructions.
function matches(skill: Skill, query: string) {
  const text = [skill.name, skill.description ?? "", skill.instructions]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The title opens the skill to edit, and stretches over the whole row so the
// row opens it too. The row's own buttons sit above it.
const rowTrigger =
  "text-start outline-none after:absolute after:-inset-px after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
const row = "relative hover:bg-muted/50"

function SkillRow({ skill }: { skill: Skill }) {
  const [editing, setEditing] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemMedia variant="icon">
        <ProjectTile icon={skill.icon} color={skill.color} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>
          <button
            type="button"
            className={rowTrigger}
            onClick={() => setEditing(true)}
          >
            {skill.name}
          </button>
        </ItemTitle>
        <ItemDescription className="line-clamp-2">
          {skill.description ?? firstLine(skill.instructions)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10">
        <SkillActions
          skill={skill}
          editing={editing}
          onEditingChange={setEditing}
        />
      </ItemActions>
    </Item>
  )
}

// Skills that ship with the app, then the ones saved in this browser.
function ExtensionsPage({ bundled }: { bundled: Skill[] }) {
  // Undefined until the store answers.
  const [skills, setSkills] = React.useState<Skill[]>()
  const [creating, setCreating] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)

  // Loaded, then again whenever they change, here or in another tab.
  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      listSkills().then((list) => {
        if (!cancelled) setSkills(list)
      })
    load()
    const stop = subscribeSkills(load)
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const all = skills && [...bundled, ...skills]
  const shown = all?.filter((skill) => matches(skill, query)) ?? []

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Extensions</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-tight">
                Extensions
              </h1>
              <p className="text-sm text-muted-foreground">
                Skills the model follows. The ones that ship with the app sit
                with the ones saved in this browser.
              </p>
            </div>
            <Button className="shrink-0" onClick={() => setCreating(true)}>
              <HugeiconsIcon aria-hidden icon={Add01Icon} />
              Add
            </Button>
          </div>
          {/* Only once there's something to search. */}
          {all?.length ? (
            <InputGroup className="h-9 rounded-full">
              <InputGroupAddon>
                <HugeiconsIcon aria-hidden icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                ref={search}
                type="text"
                aria-label="Search extensions"
                placeholder="Search extensions"
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
        {all === undefined ? null : all.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            No extensions yet.
          </p>
        ) : shown.length > 0 ? (
          <ItemGroup
            aria-label="Extensions"
            className="grid gap-x-6 sm:grid-cols-2"
          >
            {shown.map((skill) => (
              <SkillRow key={skill.id} skill={skill} />
            ))}
          </ItemGroup>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No extensions match “{query.trim()}”.
          </p>
        )}
      </div>
      <SkillDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}

export { ExtensionsPage }
