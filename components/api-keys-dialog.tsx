"use client"

import * as React from "react"
import {
  ArrowUpRight01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  GATEWAY_KEY_PREFIX,
  GATEWAY_KEY_URL,
  loadApiKeys,
  PROVIDERS,
  saveApiKeys,
  type ApiKeys,
  type ProviderId,
} from "@/lib/api-keys"

/** A key, hidden like a password until shown. */
function KeyField({
  id,
  label,
  value,
  onChange,
  placeholder,
  keyUrl,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Where to make a key, linked beside the label. */
  keyUrl?: string
}) {
  const [shown, setShown] = React.useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {keyUrl ? (
          <a
            href={keyUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Get ${/^[AEIOU]/.test(label) ? "an" : "a"} ${label} key`}
            className="inline-flex items-center gap-0.5 rounded-sm text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get a key
            <HugeiconsIcon
              aria-hidden
              icon={ArrowUpRight01Icon}
              className="size-3"
            />
          </a>
        ) : null}
      </div>
      <InputGroup>
        <InputGroupInput
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          // A key, not a password: nothing to fill in or offer to save.
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          className="font-mono text-xs"
        />
        <InputGroupAddon align="inline-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={shown ? "Hide key" : "Show key"}
                    aria-pressed={shown}
                    onClick={() => setShown((current) => !current)}
                  />
                }
              >
                <HugeiconsIcon
                  aria-hidden
                  icon={shown ? ViewOffSlashIcon : ViewIcon}
                />
              </TooltipTrigger>
              <TooltipContent>{shown ? "Hide key" : "Show key"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

// Mounted only while the dialog is open, so it starts from what's saved.
function ApiKeysForm({ onDone }: { onDone: () => void }) {
  const [keys, setKeys] = React.useState<ApiKeys>(loadApiKeys)
  const setProvider = (id: ProviderId, value: string) =>
    setKeys((current) => ({
      ...current,
      providers: { ...current.providers, [id]: value },
    }))

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        saveApiKeys(keys)
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>API keys</DialogTitle>
        <DialogDescription>
          Models from a provider with a key here are called directly; the rest
          go through the Vercel AI Gateway. Kept in this browser only.
        </DialogDescription>
      </DialogHeader>

      {/* Only the fields scroll; the header and footer stay put. Run out to
          the dialog's edges, so the scrollbar sits at its side, with room
          for the inputs' focus rings. */}
      <div className="-mx-4 -my-1 flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-1">
        {/* One list: the Gateway is a key like any other, first. */}
        <KeyField
          id="api-key-gateway"
          label="Vercel AI Gateway"
          value={keys.gateway ?? ""}
          onChange={(gateway) =>
            setKeys((current) => ({ ...current, gateway }))
          }
          placeholder={`${GATEWAY_KEY_PREFIX}…`}
          keyUrl={GATEWAY_KEY_URL}
        />
        {PROVIDERS.map((provider) => (
          <KeyField
            key={provider.id}
            id={`api-key-${provider.id}`}
            label={provider.name}
            value={keys.providers?.[provider.id] ?? ""}
            onChange={(value) => setProvider(provider.id, value)}
            // How the provider's keys begin, so the right one goes where.
            placeholder={
              provider.keyPrefix
                ? `${provider.keyPrefix}…`
                : `${provider.name} API key`
            }
            keyUrl={provider.keyUrl}
          />
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="destructive" onClick={() => setKeys({})}>
          Clear all
        </Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  )
}

/** Where the Gateway key and provider keys are set. */
function ApiKeysDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Header, fields and footer as rows; the fields take what's left. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-md">
        <ApiKeysForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

export { ApiKeysDialog }
