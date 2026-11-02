"use client"

import * as React from "react"
import {
  ChartLineData01Icon,
  HelpCircleIcon,
  Key01Icon,
  Login03Icon,
  Logout01Icon,
  Settings01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ApiKeysDialog } from "@/components/api-keys-dialog"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LoginDialog, type LoginValues } from "@/components/login-form"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type User = {
  name: string
  /** Their picture. Without one, they get a critter drawn from their name. */
  avatar?: string
  /** The plan they are on, e.g. "Pro" or "Free", badged beside their name. */
  plan?: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/** A critter drawn from their name, so the same name always gets the same one. */
function avatarUrl(name: string) {
  return `https://avatar.aiellie.dev/${encodeURIComponent(name)}.svg?style=critters`
}

function UserAvatar({ user }: { user: User }) {
  return (
    <Avatar size="sm">
      <AvatarImage src={user.avatar ?? avatarUrl(user.name)} alt="" />
      <AvatarFallback>{initials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

function NavUser({
  user,
  usage,
  onUsage,
  onInvite,
  onSettings,
  onHelp,
  onLogOut,
  onSignIn,
  login,
}: {
  /** Who is signed in. Without one, the row is a Sign in button that opens the login dialog. */
  user?: User
  /** How much of their plan is left, e.g. "72% left", shown beside Usage. */
  usage?: string
  onUsage?: () => void
  onInvite?: () => void
  onSettings?: () => void
  onHelp?: () => void
  onLogOut?: () => void
  /** Return a promise to keep the dialog open and working until it settles. */
  onSignIn?: (values: LoginValues) => void | Promise<void>
  /** Passed on to the login dialog. */
  login?: Omit<
    React.ComponentProps<typeof LoginDialog>,
    "open" | "onOpenChange" | "onSubmit"
  >
}) {
  const [loginOpen, setLoginOpen] = React.useState(false)
  const [apiKeysOpen, setApiKeysOpen] = React.useState(false)

  if (!user) {
    return (
      <>
        <SidebarMenu data-slot="user-menu">
          <SidebarMenuItem>
            <SidebarMenuButton
              data-slot="user-menu-sign-in"
              aria-haspopup="dialog"
              onClick={() => setLoginOpen(true)}
            >
              <HugeiconsIcon icon={Login03Icon} aria-hidden />
              <span className="min-w-0 flex-1 truncate">Sign in</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <LoginDialog
          {...login}
          open={loginOpen}
          onOpenChange={setLoginOpen}
          onSubmit={onSignIn}
        />
      </>
    )
  }

  return (
    <SidebarMenu data-slot="user-menu">
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={
              <SidebarMenuButton className="data-popup-open:bg-sidebar-accent" />
            }
          >
            <UserAvatar user={user} />
            <span className="min-w-0 flex-1 truncate">{user.name}</span>
          </MenuTrigger>
          <MenuContent side="top" className="w-(--anchor-width) min-w-48">
            {/* Small text on glass takes foreground ink to hold its contrast. */}
            <div className="flex items-center gap-2 px-2 py-1">
              <UserAvatar user={user} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {user.name}
              </span>
              {user.plan ? (
                <Badge variant="secondary">{user.plan}</Badge>
              ) : null}
            </div>
            <MenuSeparator />
            <MenuItem onClick={onUsage}>
              <HugeiconsIcon icon={ChartLineData01Icon} aria-hidden />
              Usage
              {usage ? <MenuShortcut>{usage}</MenuShortcut> : null}
            </MenuItem>
            <MenuItem onClick={onInvite}>
              <HugeiconsIcon icon={UserAdd01Icon} aria-hidden />
              Invite a friend
            </MenuItem>
            <MenuItem onClick={onSettings}>
              <HugeiconsIcon icon={Settings01Icon} aria-hidden />
              Settings
            </MenuItem>
            <MenuItem onClick={() => setApiKeysOpen(true)}>
              <HugeiconsIcon icon={Key01Icon} aria-hidden />
              API keys
            </MenuItem>
            <MenuItem onClick={onHelp}>
              <HugeiconsIcon icon={HelpCircleIcon} aria-hidden />
              Help
            </MenuItem>
            <MenuSeparator />
            <MenuItem onClick={onLogOut}>
              <HugeiconsIcon icon={Logout01Icon} aria-hidden />
              Log out
            </MenuItem>
          </MenuContent>
        </Menu>
        {/* Out here, as the menu unmounts its rows once it closes. */}
        <ApiKeysDialog open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { NavUser }
export type { User }
