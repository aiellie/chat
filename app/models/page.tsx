"use client"

import * as React from "react"
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  groupByProvider,
  ModelIcon,
  providerLabel,
} from "@/components/aiellie/model-selector"
import { contextOf, ModelDetails } from "@/components/model-details"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { apiKeyHeaders, onApiKeysChange } from "@/lib/api-keys"
import type { ModelOption } from "@/lib/models"

// Whether a model has every word searched for, in its name, its id or who
// makes it.
function matches(model: ModelOption, query: string) {
  const text = [model.name, model.id, providerLabel(model.id)]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

// The title opens the row's dialog, and stretches over the whole row so the
// row opens it too. The row's own buttons sit above it.
const rowTrigger =
  "text-start outline-none after:absolute after:-inset-px after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
const row = "relative hover:bg-muted/50"

function ModelRow({ model }: { model: ModelOption }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Item role="listitem" variant="outline" className={row}>
      <ItemMedia
        variant="icon"
        className="size-9 rounded-lg border border-border/60"
      >
        <ModelIcon id={model.id} className="size-5" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>
          <button
            type="button"
            className={rowTrigger}
            onClick={() => setOpen(true)}
          >
            {model.name}
          </button>
        </ItemTitle>
        {/* The section names the provider already. */}
        <ItemDescription>{contextOf(model) ?? model.id}</ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10">
        <ModelDetails model={model} open={open} onOpenChange={setOpen} />
      </ItemActions>
    </Item>
  )
}

// The models the chat can talk to, as the Gateway and the API keys offer
// them, to keep track of. It sits in the shell from the layout, in the chat's
// place.
export default function ModelsPage() {
  // Undefined while loading; empty when none came back.
  const [models, setModels] = React.useState<ModelOption[]>()
  const [query, setQuery] = React.useState("")
  const search = React.useRef<HTMLInputElement>(null)

  // As the model picker loads them, and again when the keys change, since a
  // new key can offer other models.
  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch("/api/models", { headers: apiKeyHeaders() })
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => [])
        .then((list: ModelOption[]) => {
          if (!cancelled) setModels(list)
        })
    load()
    const stop = onApiKeysChange(load)
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const shown = models?.filter((model) => matches(model, query)) ?? []

  const clear = () => {
    setQuery("")
    search.current?.focus()
  }

  return (
    // Scrolls under the main panel's glass header, so it starts below it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <title>Models</title>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-16 pb-10">
        <header className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-medium tracking-tight">Models</h1>
            <p className="text-sm text-muted-foreground">
              {models?.length
                ? `The ${models.length} the chat can talk to, through the Gateway or your own keys.`
                : "The models the chat can talk to, through the Gateway or your own keys."}
            </p>
          </div>
          <InputGroup className="h-9 rounded-full">
            <InputGroupAddon>
              <HugeiconsIcon aria-hidden icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              ref={search}
              type="text"
              aria-label="Search models"
              placeholder="Search models"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault()
                  setQuery("")
                }
              }}
            />
            {/* Disabled rather than hidden while empty, so the end of the
                field doesn't shift. Clearing puts focus back in it. */}
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                disabled={!query}
                onClick={clear}
                className="rounded-full disabled:opacity-30"
              >
                <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </header>
        {models === undefined ? (
          // Their shape is known while they load.
          <div aria-hidden className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5"
              >
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : models.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            No models came back. Add a Gateway key or a provider key in API
            keys.
          </p>
        ) : shown.length > 0 ? (
          // A section for each provider, in the order the model picker
          // groups them.
          groupByProvider(shown).map(([provider, group]) => (
            <section key={provider} className="flex flex-col gap-3">
              <h2 className="text-base font-medium">
                {providerLabel(group[0].id)}
              </h2>
              <ItemGroup
                aria-label={providerLabel(group[0].id)}
                className="grid gap-x-6 sm:grid-cols-2"
              >
                {group.map((model) => (
                  <ModelRow key={model.id} model={model} />
                ))}
              </ItemGroup>
            </section>
          ))
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No models match “{query.trim()}”.
          </p>
        )}
      </div>
    </div>
  )
}
