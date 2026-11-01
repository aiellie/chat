"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { modelIcons, type ModelIconName } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import type { ModelOption } from "@/lib/models"
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

function ModelSelector({
  models,
  value,
  onValueChange,
  disabled = false,
  className,
}: {
  models: ModelOption[]
  value: string
  onValueChange: (id: string) => void
  disabled?: boolean
  className?: string
}) {
  const selected = models.find((model) => model.id === value)
  const groups = groupByProvider(models)

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
              "max-w-56 gap-1.5 text-muted-foreground hover:text-foreground data-popup-open:text-foreground",
              className
            )}
          />
        }
      >
        <span className="sr-only">Model: </span>
        <ModelIcon id={value} className="size-3.5" />
        <span className="truncate">{selected?.name ?? value}</span>
        <HugeiconsIcon
          aria-hidden
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3 shrink-0"
        />
      </MenuTrigger>
      <MenuContent
        side="top"
        align="start"
        showSearch
        searchPlaceholder="Search models"
        emptyMessage="No models match"
        className="max-h-[min(var(--available-height),24rem)] w-72"
      >
        {/* Flat rather than wrapped in fragments, so the search can see each group. */}
        {groups.flatMap(([provider, items], index) => [
          index > 0 ? <MenuSeparator key={`${provider}-separator`} /> : null,
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
      </MenuContent>
    </Menu>
  )
}

export { ModelSelector }
