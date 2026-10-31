"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

type ChatMode = "chat" | "code"

const MODES: { id: ChatMode; name: string; description: string }[] = [
  {
    id: "chat",
    name: "Chat",
    description: "Ask, write and think things through",
  },
  {
    id: "code",
    name: "Code",
    description: "Build and change code in a project",
  },
]

function ChatSwitcher({
  value,
  onValueChange,
}: {
  value: ChatMode
  onValueChange: (value: ChatMode) => void
}) {
  const selected = MODES.find((mode) => mode.id === value) ?? MODES[0]

  return (
    <Menu>
      <MenuTrigger
        data-slot="chat-switcher"
        render={<SidebarMenuButton className="w-fit text-lg font-medium" />}
      >
        <span className="sr-only">Mode: </span>
        <span>{selected.name}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          aria-hidden
          className="size-3.5! text-muted-foreground transition-transform duration-150 group-aria-expanded/menu-button:rotate-180 motion-reduce:transition-none"
        />
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        <MenuRadioGroup
          value={value}
          onValueChange={(next: ChatMode) => onValueChange(next)}
        >
          {MODES.map((mode) => (
            <MenuRadioItem key={mode.id} value={mode.id} closeOnClick>
              <span className="flex min-w-0 flex-col gap-0.5">
                {mode.name}
                <span className="text-[11px] font-normal text-muted-foreground/70">
                  {mode.description}
                </span>
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

export { ChatSwitcher }
export type { ChatMode }
