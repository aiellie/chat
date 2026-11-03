"use client"

import { useEffect, useState } from "react"
import {
  Folder01Icon,
  PencilEdit02Icon,
  BubbleChatAddIcon,
  AiCloud02Icon,
  Plug02Icon,
  ShapeCollectionIcon,
  DashboardSquare01Icon,
  TimeScheduleIcon,
  ChatBotIcon,
  EllipsisIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { usePanels } from "@/components/panels"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const kbd = "rounded-sm bg-background/15 px-1 font-sans"

function ChatNavMain({
  newChatOpen,
  onNewChat,
  onQuickChat,
  onProjects,
  onStashd,
  onExtensions,
  onElements,
  elementsOpen = false,
  onTools,
  toolsOpen = false,
  onScheduled,
  onAgents,
  onModels,
  modelsOpen = false,
  projectsOpen = false,
  stashdOpen = false,
  extensionsOpen = false,
}: {
  newChatOpen: boolean
  onNewChat: () => void
  /** Left out, the button is there but does nothing. */
  onQuickChat?: () => void
  /** Where the projects live. Left out, the row is there but goes nowhere. */
  onProjects?: () => void
  /** Where the stashd live. Left out, the row is there but goes nowhere. */
  onStashd?: () => void
  /** Where the extensions live. Left out, the row is there but goes nowhere. */
  onExtensions?: () => void
  /** Where the tools live. Left out, the row is there but goes nowhere. */
  onTools?: () => void
  /** Whether the Tools page is open, to mark its row. */
  toolsOpen?: boolean
  /** Where the scheduled tasks live. Left out, the row is there but goes nowhere. */
  onScheduled?: () => void
  /** Where the agents live. Left out, the row is there but goes nowhere. */
  onAgents?: () => void
  /** Where the models live. Left out, the row is there but goes nowhere. */
  onModels?: () => void
  /** Whether the Models page is open, to mark its row. */
  modelsOpen?: boolean
  /** Whether the Projects page is open, to mark its row. */
  projectsOpen?: boolean
  /** Whether the Stashd page is open, to mark its row. */
  stashdOpen?: boolean
  /** Whether the Extensions page is open, to mark its row. */
  extensionsOpen?: boolean
  /** Where the registry's elements are shown. Left out, the row goes nowhere. */
  onElements?: () => void
  /** Whether the Elements page is open, to mark its row. */
  elementsOpen?: boolean
}) {
  const { closeSheet } = usePanels()
  const moreActive = elementsOpen || modelsOpen
  const [moreOpen, setMoreOpen] = useState(moreActive)

  useEffect(() => {
    if (moreActive) setMoreOpen(true)
  }, [moreActive])

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-0.5">
        <SidebarMenuItem className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <SidebarMenuButton
                  isActive={newChatOpen}
                  aria-current={newChatOpen ? "page" : undefined}
                  aria-keyshortcuts="Meta+N"
                  onClick={() => {
                    onNewChat()
                    closeSheet()
                  }}
                  className="min-w-0 flex-1"
                />
              }
            >
              <HugeiconsIcon icon={PencilEdit02Icon} aria-hidden />
              <span>New chat</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              New chat
              <kbd data-slot="kbd" className={kbd}>
                ⌘N
              </kbd>
            </TooltipContent>
          </Tooltip>
          <TooltipIconButton
            tooltip="Quick chat"
            shortcut="⌘⇧N"
            aria-keyshortcuts="Meta+Shift+N"
            onClick={() => {
              onQuickChat?.()
              closeSheet()
            }}
            className="size-7.5 shrink-0"
          >
            <HugeiconsIcon icon={BubbleChatAddIcon} />
          </TooltipIconButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={stashdOpen}
            aria-current={stashdOpen ? "page" : undefined}
            onClick={() => {
              onStashd?.()
              closeSheet()
            }}
          >
            <HugeiconsIcon icon={AiCloud02Icon} aria-hidden />
            <span>Stashd</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={projectsOpen}
            aria-current={projectsOpen ? "page" : undefined}
            onClick={() => {
              onProjects?.()
              closeSheet()
            }}
          >
            <HugeiconsIcon icon={Folder01Icon} aria-hidden />
            <span>Projects</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            aria-expanded={moreOpen}
            className="text-sidebar-foreground/70"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <HugeiconsIcon icon={EllipsisIcon} aria-hidden />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {moreOpen ? (
          <>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={extensionsOpen}
            aria-current={extensionsOpen ? "page" : undefined}
            onClick={() => {
              onExtensions?.()
              closeSheet()
            }}
          >
            <HugeiconsIcon icon={Plug02Icon} aria-hidden />
            <span>Extensions</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={toolsOpen}
            aria-current={toolsOpen ? "page" : undefined}
            onClick={() => {
              onTools?.()
              closeSheet()
            }}
          >
            <HugeiconsIcon icon={ShapeCollectionIcon} aria-hidden />
            <span>Tools</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
       
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={elementsOpen}
                aria-current={elementsOpen ? "page" : undefined}
                onClick={() => {
                  onElements?.()
                  closeSheet()
                }}
              >
                <HugeiconsIcon icon={DashboardSquare01Icon} aria-hidden />
                <span>Elements</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={modelsOpen}
                aria-current={modelsOpen ? "page" : undefined}
                onClick={() => {
                  onModels?.()
                  closeSheet()
                }}
              >
                <HugeiconsIcon icon={ChatBotIcon} aria-hidden />
                <span>Models</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export { ChatNavMain }
