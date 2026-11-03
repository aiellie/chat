import type { Memory, MemoryChanges } from "@/components/memory-store"

// The Memory doc in Stashd: every memory as one bullet of a Markdown list,
// which the person edits in the rich text editor. The memories stay in
// components/memory-store.ts; this file only turns them into the list and
// works out what an edited list changed, so the store can follow it.

// Oldest first, so the list grows downward as a doc does, and a memory
// keeps its place when it's edited.
const inDocOrder = (memories: Memory[]) =>
  [...memories].sort((a, b) => a.createdAt - b.createdAt)

// Characters that would turn a memory's words into formatting.
const escape = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\`*_[\]<>#~|]/g, "\\$&")
    .replace(/^(\d+)\./, "$1\\.")
    .replace(/^([-+])(?=\s)/, "\\$1")

const unescape = (text: string) => text.replace(/\\([!-/:-@[-`{-~])/g, "$1")

/** The list the doc opens with: one bullet per memory, oldest first. */
function memoriesToMarkdown(memories: Memory[]): string {
  return inDocOrder(memories)
    .map((memory) => `- ${escape(memory.text)}`)
    .join("\n")
}

/**
 * The memories a doc holds, in order: one for each line with words in it,
 * without the marks that make it a bullet, a numbered item, a task, a
 * heading or a quote. A nested bullet is a memory of its own.
 */
function linesOf(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => !/^\s*(```|~~~)/.test(line))
    .map((line) =>
      unescape(
        line
          .replace(/^\s*(?:>\s*)*/, "")
          .replace(/^(?:[-*+]|\d+[.)])\s+/, "")
          .replace(/^\[[ xX]\]\s+/, "")
          .replace(/^#{1,6}\s+/, "")
          .trim()
      )
    )
    .filter((line) => line !== "")
}

/**
 * What changed between the memories and the doc as edited. A line that
 * still reads as a memory does keeps it. Between those, changed lines
 * rewrite the memories that were in their place, in order, and what's left
 * over is new, or was deleted. So editing a bullet keeps its memory, with
 * who saved it and from which chat.
 */
function changesFrom(markdown: string, memories: Memory[]): MemoryChanges {
  const lines = linesOf(markdown)
  const kept = inDocOrder(memories)

  // The longest run of lines left as they were, in order.
  const length = Array.from({ length: lines.length + 1 }, () =>
    new Array<number>(kept.length + 1).fill(0)
  )
  for (let i = lines.length - 1; i >= 0; i--)
    for (let j = kept.length - 1; j >= 0; j--)
      length[i][j] =
        lines[i] === kept[j].text.trim()
          ? length[i + 1][j + 1] + 1
          : Math.max(length[i + 1][j], length[i][j + 1])

  const changes: MemoryChanges = { create: [], update: [], remove: [] }
  let gapLines: string[] = []
  let gapMemories: Memory[] = []
  const settle = () => {
    const paired = Math.min(gapLines.length, gapMemories.length)
    for (let k = 0; k < paired; k++)
      changes.update.push({ id: gapMemories[k].id, text: gapLines[k] })
    changes.create.push(...gapLines.slice(paired))
    changes.remove.push(...gapMemories.slice(paired).map(({ id }) => id))
    gapLines = []
    gapMemories = []
  }

  let i = 0
  let j = 0
  while (i < lines.length || j < kept.length) {
    if (
      i < lines.length &&
      j < kept.length &&
      lines[i] === kept[j].text.trim()
    ) {
      settle()
      i++
      j++
    } else if (
      j < kept.length &&
      (i === lines.length || length[i][j + 1] >= length[i + 1][j])
    ) {
      gapMemories.push(kept[j++])
    } else {
      gapLines.push(lines[i++])
    }
  }
  settle()
  return changes
}

export { changesFrom, linesOf, memoriesToMarkdown }
