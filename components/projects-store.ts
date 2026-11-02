// Projects, kept in this browser's localStorage for now, as threads are, so
// they survive a reload without an account. They don't follow the person to
// another browser.
//
// Pages only ever call the functions below, never localStorage, and every
// one returns a promise, as a database call would. Moving projects to a
// backend means rewriting the inside of this file, and nothing that uses it.

type Project = {
  id: string
  name: string
  /** What the project is for, if the person said. */
  description?: string
  /** Its icon and colour, by name, from components/project-icon.tsx. */
  icon?: string
  color?: string
  createdAt: number
  updatedAt: number
}

/** What a person fills in to create or edit a project. */
type ProjectInput = {
  name: string
  description?: string
  icon?: string
  color?: string
}

const KEY = "aiellie:projects"

const listeners = new Set<() => void>()

function read(): Project[] {
  try {
    const value = localStorage.getItem(KEY)
    return value ? (JSON.parse(value) as Project[]) : []
  } catch {
    return []
  }
}

function write(projects: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects))
  } catch {
    // Full or blocked storage keeps the change for this visit only.
  }
  listeners.forEach((listener) => listener())
}

const clean = (input: ProjectInput) => ({
  name: input.name.trim(),
  description: input.description?.trim() || undefined,
  icon: input.icon,
  color: input.color,
})

/** Every project, the most recently changed first. */
async function listProjects(): Promise<Project[]> {
  return read().sort((a, b) => b.updatedAt - a.updatedAt)
}

async function createProject(input: ProjectInput): Promise<Project> {
  const now = Date.now()
  const project = {
    id: crypto.randomUUID(),
    ...clean(input),
    createdAt: now,
    updatedAt: now,
  }
  write([project, ...read()])
  return project
}

/** The project as changed, or undefined if there's no such project. */
async function updateProject(
  id: string,
  input: ProjectInput
): Promise<Project | undefined> {
  let updated: Project | undefined
  write(
    read().map((project) =>
      project.id === id
        ? (updated = { ...project, ...clean(input), updatedAt: Date.now() })
        : project
    )
  )
  return updated
}

async function deleteProject(id: string): Promise<void> {
  write(read().filter((project) => project.id !== id))
}

/**
 * Calls back whenever the projects change, here or in another tab. A backend
 * would call it from its own change feed. Returns the unsubscribe.
 */
function subscribeProjects(listener: () => void) {
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

export {
  createProject,
  deleteProject,
  listProjects,
  subscribeProjects,
  updateProject,
}
export type { Project, ProjectInput }
