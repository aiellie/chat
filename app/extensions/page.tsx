"use client"

import * as React from "react"
import {
  Add01Icon,
  Cancel01Icon,
  ConnectIcon,
  MagicWand01Icon,
  Plug02Icon,
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"

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
        <ItemDescription>
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

// The person's skills, from components/skills-store.ts.
function SkillsPanel() {
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

  const shown = skills?.filter((skill) => matches(skill, query)) ?? []

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        {/* Only once there's something to search. */}
        {skills?.length ? (
          <InputGroup className="h-9 flex-1 rounded-full">
            <InputGroupAddon>
              <HugeiconsIcon aria-hidden icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              ref={search}
              type="text"
              aria-label="Search skills"
              placeholder="Search skills"
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
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            {skills ? "No skills yet." : null}
          </p>
        )}
        <Button className="shrink-0" onClick={() => setCreating(true)}>
          <HugeiconsIcon aria-hidden icon={Add01Icon} />
          Add
        </Button>
      </div>
      {!skills?.length ? null : shown.length > 0 ? (
        <ItemGroup aria-label="Skills" className="grid gap-x-6 sm:grid-cols-2">
          {shown.map((skill) => (
            <SkillRow key={skill.id} skill={skill} />
          ))}
        </ItemGroup>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          No skills match “{query.trim()}”.
        </p>
      )}
      <SkillDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}

// Skills, plugins and connectors, each in its tab. It sits in the shell from
// the layout, in the chat's place.
export default function ExtensionsPage() {
  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Extensions</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Extensions</h1>
          <p className="text-sm text-muted-foreground">
            Skills, plugins and connectors, saved in this browser.
          </p>
        </header>
        <Tabs defaultValue="skills">
          <TabsList aria-label="Extensions">
            <TabsTab value="skills">
              <HugeiconsIcon aria-hidden icon={MagicWand01Icon} />
              Skills
            </TabsTab>
            <TabsTab value="plugins">
              <HugeiconsIcon aria-hidden icon={Plug02Icon} />
              Plugins
            </TabsTab>
            <TabsTab value="connectors">
              <HugeiconsIcon aria-hidden icon={ConnectIcon} />
              Connectors
            </TabsTab>
          </TabsList>
          <TabsPanel value="skills">
            <SkillsPanel />
          </TabsPanel>
          <TabsPanel value="plugins">
            <p role="status" className="text-sm text-muted-foreground">
              No plugins yet.
            </p>
          </TabsPanel>
          <TabsPanel value="connectors">
            <p role="status" className="text-sm text-muted-foreground">
              No connectors yet.
            </p>
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  )
}
