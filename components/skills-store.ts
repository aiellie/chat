// Skills: instructions the person writes once for the model to follow, like
// a house style or a review checklist. Kept in this browser's localStorage
// for now, as projects are, so they survive a reload without an account.
// They don't follow the person to another browser.
//
// Pages only ever call the functions below, never localStorage, and every
// one returns a promise, as a database call would. Moving skills to a
// backend means rewriting the inside of this file, and nothing that uses it.

type Skill = {
  id: string
  name: string
  /** What it's for, in a line, as its row says. */
  description?: string
  /** What the model is told to do, in Markdown. */
  instructions: string
  /** Its icon and colour, by name, from components/project-icon.tsx. */
  icon?: string
  color?: string
  createdAt: number
  updatedAt: number
  /** Ships with the app, from a skill file. It isn't saved in this browser. */
  bundled?: boolean
}

/** What a person fills in to add or edit a skill. */
type SkillInput = {
  name: string
  description?: string
  instructions: string
  icon?: string
  color?: string
}

const KEY = "aiellie:skills"

const listeners = new Set<() => void>()

function read(): Skill[] {
  try {
    const value = localStorage.getItem(KEY)
    return value ? (JSON.parse(value) as Skill[]) : []
  } catch {
    return []
  }
}

function write(skills: Skill[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(skills))
  } catch {
    // Full or blocked storage keeps the change for this visit only.
  }
  listeners.forEach((listener) => listener())
}

const clean = (input: SkillInput) => ({
  name: input.name.trim(),
  description: input.description?.trim() || undefined,
  instructions: input.instructions.trim(),
  icon: input.icon,
  color: input.color,
})

/** Every skill, the most recently changed first. */
async function listSkills(): Promise<Skill[]> {
  return read().sort((a, b) => b.updatedAt - a.updatedAt)
}

async function createSkill(input: SkillInput): Promise<Skill> {
  const now = Date.now()
  const skill = {
    id: crypto.randomUUID(),
    ...clean(input),
    createdAt: now,
    updatedAt: now,
  }
  write([skill, ...read()])
  return skill
}

/** The skill as changed, or undefined if there's no such skill. */
async function updateSkill(
  id: string,
  input: SkillInput
): Promise<Skill | undefined> {
  let updated: Skill | undefined
  write(
    read().map((skill) =>
      skill.id === id
        ? (updated = { ...skill, ...clean(input), updatedAt: Date.now() })
        : skill
    )
  )
  return updated
}

async function deleteSkill(id: string): Promise<void> {
  write(read().filter((skill) => skill.id !== id))
}

/**
 * Calls back whenever the skills change, here or in another tab. A backend
 * would call it from its own change feed. Returns the unsubscribe.
 */
function subscribeSkills(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export { createSkill, deleteSkill, listSkills, subscribeSkills, updateSkill }
export type { Skill, SkillInput }
