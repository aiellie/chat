import { BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { signIn } from "@/app/actions"
import { Button } from "@/components/ui/button"

function Landing() {
  return (
    <div className="flex h-svh flex-col overflow-auto">
      <header className="flex h-12 shrink-0 items-center gap-2 px-4">
        <HugeiconsIcon icon={BubbleChatIcon} className="size-5" aria-hidden />
        <span className="text-sm font-medium">Chat</span>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Talk with the people you work with
            </h1>
            <p className="text-sm text-muted-foreground">
              Every conversation in one place. Sign in to pick up where you left
              off.
            </p>
          </div>
          <form action={signIn} className="flex flex-col gap-3">
            <label htmlFor="name" className="sr-only">
              Your name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={40}
              autoComplete="name"
              placeholder="Your name"
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
            <Button type="submit" size="lg">
              Sign in
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

export { Landing }
