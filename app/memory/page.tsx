import { redirect } from "next/navigation"

// Memories are edited in the Memory doc, which opens over Stashd.
export default function MemoryPage() {
  redirect("/stashd?open=memory")
}
