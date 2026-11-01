"use client"

import {
  AiBrain01Icon,
  ArrowDown01Icon,
  FlashIcon,
  TextIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { modelIcons, type ModelIconName } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu"
import { Switch } from "@/components/ui/switch"
import type { Effort, ModelOption } from "@/lib/models"
import { cn } from "@/lib/utils"

// Keyed by the provider half of a gateway id.
const providers: Record<string, { label: string; icon?: ModelIconName }> = {
  anthropic: { label: "Anthropic", icon: "claude" },
  openai: { label: "OpenAI", icon: "openai" },
  google: { label: "Google", icon: "gemini" },
  spacexai: { label: "xAI", icon: "grok" },
  xai: { label: "xAI", icon: "grok" },
  deepseek: { label: "DeepSeek", icon: "deepseek" },
  mistral: { label: "Mistral", icon: "mistral" },
}

const EFFORT_LABELS: Record<Effort, string> = {
  none: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Max",
}

const tokens = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function providerOf(id: string) {
  return id.split("/")[0] ?? id
}

function ModelIcon({ id, className }: { id: string; className?: string }) {
  const icon = providers[providerOf(id)]?.icon
  const Icon = icon ? modelIcons[icon] : undefined
  // An empty box keeps names lined up when a provider has no mark.
  return Icon ? (
    <Icon className={cn("size-4 shrink-0", className)} />
  ) : (
    <span aria-hidden className={cn("size-4 shrink-0", className)} />
  )
}

// Providers with a mark come first, in the order above; the rest follow
// alphabetically. Models keep the order they were given in.
function groupByProvider(models: ModelOption[]) {
  const known = Object.keys(providers)
  const groups = new Map<string, ModelOption[]>()
  for (const model of models) {
    const provider = providerOf(model.id)
    groups.set(provider, [...(groups.get(provider) ?? []), model])
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = known.indexOf(a)
    const bi = known.indexOf(b)
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
    }
    return a.localeCompare(b)
  })
}

/** A submenu's current pick, muted at the end of its row. */
function Current({ children }: { children: React.ReactNode }) {
  return (
    <span className="ms-auto min-w-0 truncate ps-3 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

/**
 * The model and how it runs: a menu whose Model, Effort and Context rows
 * open submenus, and a Fast switch. Effort and Context show only for a model
 * with a choice of them, and Fast only for one with a fast variant.
 */
function ModelSelector({
  models,
  value,
  onValueChange,
  effort,
  onEffortChange,
  context,
  onContextChange,
  fast = false,
  onFastChange,
  disabled = false,
  className,
}: {
  models: ModelOption[]
  value: string
  onValueChange: (id: string) => void
  /** The effort in use, if the model reasons. */
  effort?: Effort
  onEffortChange?: (effort: Effort) => void
  /** The context size in use, if the model has a choice of them. */
  context?: number
  onContextChange?: (context: number) => void
  /** Whether the model's fast variant is in use. */
  fast?: boolean
  onFastChange?: (fast: boolean) => void
  disabled?: boolean
  className?: string
}) {
  const selected = models.find((model) => model.id === value)
  const groups = groupByProvider(models)
  const efforts = selected?.efforts ?? []
  const contexts = selected?.contexts ?? []

  return (
    <Menu>
      <MenuTrigger
        data-slot="model-selector"
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "max-w-64 gap-1.5 text-muted-foreground hover:text-foreground data-popup-open:text-foreground",
              className
            )}
          />
        }
      >
        <span className="sr-only">Model: </span>
        <ModelIcon id={value} className="size-3.5" />
        <span className="truncate">{selected?.name ?? value}</span>
        {effort && efforts.length > 1 ? (
          <span className="shrink-0 text-muted-foreground/70">
            <span aria-hidden>· </span>
            <span className="sr-only">, effort </span>
            {EFFORT_LABELS[effort]}
          </span>
        ) : null}
        {fast && selected?.fastId ? (
          <>
            <HugeiconsIcon
              aria-hidden
              icon={FlashIcon}
              className="size-3 shrink-0"
            />
            <span className="sr-only">, fast</span>
          </>
        ) : null}
        <HugeiconsIcon
          aria-hidden
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3 shrink-0"
        />
      </MenuTrigger>
      <MenuContent side="top" align="start" className="w-64">
        <MenuSub>
          <MenuSubTrigger>
            <ModelIcon id={value} />
            Model
            <Current>{selected?.name ?? value}</Current>
          </MenuSubTrigger>
          <MenuSubContent
            showSearch
            searchPlaceholder="Search models"
            emptyMessage="No models match"
            className="max-h-[min(var(--available-height),24rem)] w-72"
          >
            {/* Flat rather than wrapped in fragments, so the search can see each group. */}
            {groups.flatMap(([provider, items], index) => [
              index > 0 ? (
                <MenuSeparator key={`${provider}-separator`} />
              ) : null,
              <MenuRadioGroup
                key={provider}
                value={value}
                onValueChange={(next: string) => onValueChange(next)}
              >
                <MenuGroupLabel>
                  {providers[provider]?.label ?? provider}
                </MenuGroupLabel>
                {items.map((model) => (
                  <MenuRadioItem key={model.id} value={model.id} closeOnClick>
                    <ModelIcon id={model.id} />
                    <span className="truncate">{model.name}</span>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>,
            ])}
          </MenuSubContent>
        </MenuSub>

        {efforts.length > 1 && effort && onEffortChange ? (
          <MenuSub>
            <MenuSubTrigger>
              <HugeiconsIcon aria-hidden icon={AiBrain01Icon} />
              Effort
              <Current>{EFFORT_LABELS[effort]}</Current>
            </MenuSubTrigger>
            <MenuSubContent className="w-44">
              <MenuRadioGroup
                value={effort}
                onValueChange={(next: Effort) => onEffortChange(next)}
              >
                <MenuGroupLabel>Reasoning effort</MenuGroupLabel>
                {efforts.map((option) => (
                  <MenuRadioItem key={option} value={option} closeOnClick>
                    {EFFORT_LABELS[option]}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuSubContent>
          </MenuSub>
        ) : null}

        {contexts.length > 1 && context && onContextChange ? (
          <MenuSub>
            <MenuSubTrigger>
              <HugeiconsIcon aria-hidden icon={TextIcon} />
              Context
              <Current>{tokens.format(context)}</Current>
            </MenuSubTrigger>
            <MenuSubContent className="w-64">
              <MenuRadioGroup
                value={context}
                onValueChange={(next: number) => onContextChange(next)}
              >
                <MenuGroupLabel>Context size</MenuGroupLabel>
                {contexts.map((option, index) => (
                  <MenuRadioItem key={option} value={option} closeOnClick>
                    <span className="whitespace-nowrap">
                      {tokens.format(option)} tokens
                    </span>
                    {/* Past the first size the model charges more. */}
                    {index > 0 ? (
                      <span className="ms-auto ps-3 text-xs whitespace-nowrap text-muted-foreground">
                        Long-context rate
                      </span>
                    ) : null}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuSubContent>
          </MenuSub>
        ) : null}

        {selected?.fastId && onFastChange ? (
          <>
            <MenuSeparator />
            {/* The switch only shows the state; the row is what toggles. */}
            <MenuCheckboxItem
              checked={fast}
              onCheckedChange={onFastChange}
              closeOnClick={false}
              className="[&>[data-slot=menu-checkbox-item-indicator]]:hidden"
            >
              <HugeiconsIcon aria-hidden icon={FlashIcon} />
              Fast
              <Switch
                checked={fast}
                size="sm"
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none ms-auto"
              />
            </MenuCheckboxItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  )
}

export { ModelSelector }
