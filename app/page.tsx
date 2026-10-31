import { ChatShell } from "@/components/chat-shell"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function Page() {
  return (
    <TooltipProvider>
      <ChatShell />
    </TooltipProvider>
  )
}
