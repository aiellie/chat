"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

function Menu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />
}

function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
}

const menuPopup = (variant: "glass" | "solid") =>
  cn(
    "border",
    "min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl p-1 shadow-xl transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none data-closed:scale-95 data-closed:opacity-0",
    // Without a height to overflow, a long menu runs off the screen. Set on the
    // positioner so submenus are capped as well.
    "max-h-(--available-height)",
    variant === "glass" &&
      "border-border/40 bg-background/60 backdrop-blur-xs dark:bg-background/70",
    variant === "solid" && "bg-popover text-popover-foreground"
  )

type PositionerProps = Pick<
  MenuPrimitive.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
>

// Base UI's typeahead has no off switch, so printable keys are held back here
// or they never reach the box.
function MenuSearch({
  value,
  onValueChange,
  placeholder = "Search",
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div
      data-slot="menu-search"
      className="-mx-1 -mt-1 mb-1 flex shrink-0 items-center gap-2 border-b border-border/60 py-1 ps-3 pe-1.5"
    >
      <HugeiconsIcon
        aria-hidden
        icon={Search01Icon}
        strokeWidth={1.5}
        className="size-3.5 shrink-0 text-muted-foreground/70"
      />
      <input
        ref={inputRef}
        type="text"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          // Focus stays here while the arrows highlight a row, and Enter
          // reaches a highlighted item but not a highlighted link.
          if (event.key === "Enter") {
            const link = event.currentTarget
              .closest('[role="menu"]')
              ?.querySelector<HTMLAnchorElement>("a[data-highlighted]")
            if (link) {
              event.preventDefault()
              link.click()
              return
            }
          }
          const navigational =
            event.key.length > 1 || event.metaKey || event.ctrlKey
          if (!navigational) event.stopPropagation()
        }}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
      />

      {/* Disabled rather than hidden while empty, so the field's end doesn't shift as you type. */}
      <button
        type="button"
        data-slot="menu-search-clear"
        aria-label="Clear search"
        disabled={!value}
        onClick={(event) => {
          // The menu closes on any press that reaches it.
          event.stopPropagation()
          onValueChange("")
          inputRef.current?.focus()
        }}
        className="flex size-5 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground/70 transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:border-ring disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none dark:hover:bg-foreground/[0.09]"
      >
        <HugeiconsIcon
          aria-hidden
          icon={Cancel01Icon}
          strokeWidth={1.5}
          className="size-3"
        />
      </button>
    </div>
  )
}

function MenuContent({
  className,
  variant = "glass",
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  collisionPadding = 8,
  showSearch = false,
  searchPlaceholder,
  emptyMessage = "No matches",
  footer,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  PositionerProps & {
    variant?: "glass" | "solid"
    showSearch?: boolean
    searchPlaceholder?: string
    emptyMessage?: string
    /** Rows pinned under the list, which the search never filters. Given the search text when it is a function. */
    footer?: React.ReactNode | ((query: string) => React.ReactNode)
  }) {
  const [query, setQuery] = React.useState("")

  const rows = showSearch ? filterRows(children, query) : children
  const empty = showSearch && query !== "" && React.Children.count(rows) === 0
  const pinned = typeof footer === "function" ? footer(query) : footer

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          data-variant={variant}
          className={cn(
            menuPopup(variant),
            // The base sets `overflow-y-auto`; hidden here so the rows scroll under a
            // search box that stays put.
            showSearch && "flex flex-col overflow-y-hidden",
            className
          )}
          {...props}
        >
          {showSearch ? (
            <>
              <MenuSearch
                value={query}
                onValueChange={setQuery}
                placeholder={searchPlaceholder}
              />
              {/* Reinstates the gutter the separators bleed into, or they overhang and add a horizontal scrollbar. */}
              <div className="-mx-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1">
                {empty ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground/70">
                    {emptyMessage}
                  </div>
                ) : (
                  rows
                )}
              </div>
            </>
          ) : (
            children
          )}
          {pinned ? (
            <div
              data-slot="menu-footer"
              className="-mx-1 mt-1 shrink-0 border-t border-border/60 px-1 pt-1"
            >
              {pinned}
            </div>
          ) : null}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

const menuItem = cn(
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm font-normal text-muted-foreground transition-colors outline-none select-none",
  "data-highlighted:bg-foreground/[0.06] data-highlighted:text-foreground dark:data-highlighted:bg-foreground/[0.09]",
  "data-disabled:pointer-events-none data-disabled:opacity-50",
  "[&_svg:not([class*='size-'])]:size-4",
  "[&_svg:not([class*='stroke-width-'])]:stroke-width-1.5",
  "motion-reduce:transition-none"
)

function MenuItem({
  className,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & { variant?: "default" | "destructive" }) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-variant={variant}
      className={cn(
        menuItem,
        variant === "destructive" &&
          cn(
            // Dark takes the heavier tint: the same alpha barely registers there.
            "text-destructive data-highlighted:bg-destructive/5 data-highlighted:text-destructive dark:data-highlighted:bg-destructive/15",
            // The shortcut sets its own muted colour, so it has to be turned red too.
            "data-highlighted:**:data-[slot=menu-shortcut]:text-destructive"
          ),
        className
      )}
      {...props}
    />
  )
}

/** The same row as a real link, so modified clicks keep working. */
function MenuLinkItem({ className, ...props }: MenuPrimitive.LinkItem.Props) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="menu-link-item"
      className={cn(menuItem, className)}
      {...props}
    />
  )
}

function MenuIndicatorMark({ className }: { className?: string }) {
  return (
    <HugeiconsIcon
      aria-hidden
      icon={Tick02Icon}
      strokeWidth={2}
      className={cn("size-3.5", className)}
    />
  )
}

function MenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menu-checkbox-item"
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.CheckboxItemIndicator
        data-slot="menu-checkbox-item-indicator"
        keepMounted
        className="ms-auto ps-2 opacity-0 data-checked:opacity-100"
      >
        <MenuIndicatorMark />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  )
}

function MenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />
}

function MenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator
        data-slot="menu-radio-item-indicator"
        keepMounted
        className="ms-auto ps-2 opacity-0 data-checked:opacity-100"
      >
        <MenuIndicatorMark />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  )
}

function MenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />
}

function MenuGroupLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-group-label"
      className={cn(
        "px-2 py-1 text-xs font-medium text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function MenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menu-shortcut"
      className={cn(
        "ms-auto ps-3 text-[11px] tracking-wide text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
}

function MenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="menu-sub" {...props} />
}

function MenuSubTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-sub-trigger"
      className={cn(
        menuItem,
        "data-popup-open:bg-foreground/[0.06] data-popup-open:text-foreground dark:data-popup-open:bg-foreground/[0.09]",
        className
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon
        aria-hidden
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="ms-auto size-3.5 rtl:-scale-x-100"
      />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function MenuSubContent({
  side = "inline-end",
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof MenuContent>) {
  return (
    <MenuContent
      data-slot="menu-sub-content"
      side={side}
      align={align}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

// Leaves the shortcut out, so searching "s" doesn't match every row with ⌘S.
function labelOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(labelOf).join(" ")
  if (React.isValidElement(node)) {
    if (node.type === MenuShortcut) return ""
    return labelOf((node.props as { children?: React.ReactNode }).children)
  }
  return ""
}

// Drops groups left empty, and every separator. A submenu matches on its
// trigger's label, not on what is inside it.
function filterRows(children: React.ReactNode, query: string): React.ReactNode {
  const needle = query.trim().toLowerCase()
  if (needle === "") return children

  const matches = (node: React.ReactNode) =>
    labelOf(node).toLowerCase().includes(needle)

  const walk = (nodes: React.ReactNode): React.ReactNode[] =>
    React.Children.toArray(nodes).flatMap((child) => {
      if (!React.isValidElement(child)) return []

      const element = child as React.ReactElement<{
        children?: React.ReactNode
      }>
      const kids = element.props.children

      if (element.type === MenuSeparator) return []

      if (element.type === MenuGroup || element.type === MenuRadioGroup) {
        const kept = walk(kids)
        const hasRow = kept.some(
          (node) => React.isValidElement(node) && node.type !== MenuGroupLabel
        )
        return hasRow ? [React.cloneElement(element, {}, kept)] : []
      }

      // Kept unconditionally: the group above decides whether it survives.
      if (element.type === MenuGroupLabel) return [element]

      if (element.type === MenuSub) {
        const trigger = React.Children.toArray(kids).find(
          (node) => React.isValidElement(node) && node.type === MenuSubTrigger
        ) as React.ReactElement<{ children?: React.ReactNode }> | undefined
        return trigger && matches(trigger.props.children) ? [element] : []
      }

      if (
        element.type === MenuItem ||
        element.type === MenuCheckboxItem ||
        element.type === MenuRadioItem ||
        element.type === MenuLinkItem
      ) {
        return matches(kids) ? [element] : []
      }

      return [element]
    })

  return walk(children)
}

export {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  menuItem,
  menuPopup,
}
