import { ChatHome } from "@/components/home/chat-home"
import { Landing } from "@/components/home/landing"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSession } from "@/lib/session"

export default async function Page() {
  const session = await getSession()
  if (!session) return <Landing />

  return (
    <TooltipProvider>
      <ChatHome name={session.name} />
    </TooltipProvider>
  )
}
