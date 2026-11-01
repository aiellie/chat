"use client"

import * as React from "react"
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
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
  hint,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [shown, setShown] = React.useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
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
          <InputGroupButton
            size="icon-xs"
            aria-label={shown ? "Hide key" : "Show key"}
            aria-pressed={shown}
            onClick={() => setShown((current) => !current)}
          >
            <HugeiconsIcon
              aria-hidden
              icon={shown ? ViewOffSlashIcon : ViewIcon}
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
          Kept in this browser only, and sent with each request to this app,
          which passes them to the AI Gateway.
        </DialogDescription>
      </DialogHeader>

      {/* Only the fields scroll; the header and footer stay put. Run out to
          the dialog's edges, so the scrollbar sits at its side, with room
          for the inputs' focus rings. */}
      <div className="-mx-4 -my-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-4 py-1">
        <KeyField
          id="api-key-gateway"
          label="Vercel AI Gateway"
          hint="Used for every model. Leave it empty to use the server's key."
          value={keys.gateway ?? ""}
          onChange={(gateway) =>
            setKeys((current) => ({ ...current, gateway }))
          }
          placeholder="Gateway API key"
        />

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium">Provider keys</h3>
            <p className="text-xs text-muted-foreground">
              Optional. The Gateway uses these for that provider&apos;s models
              in place of its own credentials.
            </p>
          </div>
          {PROVIDERS.map((provider) => (
            <KeyField
              key={provider.id}
              id={`api-key-${provider.id}`}
              label={provider.name}
              value={keys.providers?.[provider.id] ?? ""}
              onChange={(value) => setProvider(provider.id, value)}
              placeholder={`${provider.name} API key`}
            />
          ))}
        </section>
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
