import fs from "node:fs"
import path from "node:path"

import type { Skill } from "@/components/skills-store"

// Skills that ship with the app, read from their files so the Extensions page
// shows the same text an agent follows. A new one is a row here.

const FILES: { id: string; file: string; icon: string; color: string }[] = [
  {
    id: "bundled:design",
    file: ".claude/skills/design/SKILL.md",
    icon: "design",
    color: "violet",
  },
  {
    id: "bundled:design-elements",
    file: ".claude/skills/design-elements/SKILL.md",
    icon: "code",
    color: "blue",
  },
]

const heading = (text: string) => text.match(/^#\s+(.+)$/m)?.[1]?.trim()

const field = (block: string, key: string) =>
  block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim()

// The title is the first heading. A description is the front-matter line, or
// the first paragraph under that heading.
function readSkill(raw: string) {
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  const body = (front ? front[2] : raw).trim()
  const name = heading(body) ?? "Skill"
  const described = front ? field(front[1], "description") : undefined
  const description =
    described ??
    body
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"))
  return { name, description, instructions: body }
}

function bundledSkills(): Skill[] {
  const root = process.cwd()
  return FILES.flatMap((entry) => {
    const full = path.join(root, entry.file)
    if (!fs.existsSync(full)) return []
    const skill = readSkill(fs.readFileSync(full, "utf8"))
    return [
      {
        id: entry.id,
        ...skill,
        icon: entry.icon,
        color: entry.color,
        createdAt: 0,
        updatedAt: 0,
        bundled: true,
      },
    ]
  })
}

export { bundledSkills }
