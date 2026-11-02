import type { Metadata } from "next"

import { SharedChatView } from "@/components/share"
import { TooltipProvider } from "@/components/ui/tooltip"

// The chat is in the link's #, which the server never sees, so the page
// reads it in the browser.
export const metadata: Metadata = { title: "Shared chat" }

export default function Page() {
  return (
    <TooltipProvider>
      <SharedChatView />
    </TooltipProvider>
  )
}
