"use client"

import * as React from "react"
import { Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { brandIcons, type IconProps } from "@/components/aiellie/icons"

type LoginValues = { email: string }

type LoginProvider = {
  id: string
  name: string
  icon: React.ComponentType<IconProps>
}

const LOGIN_PROVIDERS: LoginProvider[] = [
  { id: "google", name: "Google", icon: brandIcons.gmail },
  { id: "github", name: "GitHub", icon: brandIcons.github },
]

type LoginFormProps = Omit<React.ComponentProps<"form">, "onSubmit"> & {
  /** Return a promise to show the button working; a rejection's message shows above it. */
  onSubmit?: (values: LoginValues) => void | Promise<void>
  /** Sign-in buttons above the email form. Pass `[]` for none. */
  providers?: LoginProvider[]
  onProvider?: (id: string) => void
  /** Under the email field: what happens after Continue. */
  emailDescription?: React.ReactNode
}

function LoginForm({
  onSubmit,
  providers = LOGIN_PROVIDERS,
  onProvider,
  emailDescription = "We'll email you a verification code to sign in.",
  className,
  ...props
}: LoginFormProps) {
  const id = React.useId()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <form
      data-slot="login-form"
      className={cn("flex flex-col gap-4", className)}
      onSubmit={async (event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setError(null)
        setPending(true)
        try {
          await onSubmit?.({ email: String(data.get("email") ?? "").trim() })
        } catch (reason) {
          setError(
            reason instanceof Error && reason.message
              ? reason.message
              : "Couldn't send a code. Try again."
          )
        } finally {
          setPending(false)
        }
      }}
      {...props}
    >
      {providers.length > 0 ? (
        <>
          <div data-slot="login-form-providers" className="flex flex-col gap-2">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                size="default"
                disabled={pending}
                onClick={() => onProvider?.(provider.id)}
                // A mark in currentColor reads as the brand in full ink, not muted.
                className="[&_svg]:text-foreground"
              >
                <provider.icon data-icon="inline-start" />
                Continue with {provider.name}
              </Button>
            ))}
          </div>
          <div
            data-slot="login-form-divider"
            className="flex items-center gap-3 text-xs text-muted-foreground"
          >
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-email`} className="text-sm font-medium">
          Email
        </label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-email-description`}
        />
        <p
          id={`${id}-email-description`}
          className="text-xs text-muted-foreground"
        >
          {emailDescription}
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          data-slot="login-form-error"
          className="flex items-start gap-2 rounded-lg bg-destructive/4 px-3 py-2 text-xs text-destructive"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            aria-hidden
            className="mt-px size-3.5 shrink-0"
          />
          {error}
        </p>
      ) : null}

      <Button type="submit" size="default" disabled={pending}>
        {pending ? (
          <HugeiconsIcon
            icon={Loading03Icon}
            data-icon="inline-start"
            aria-hidden
            className="animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {pending ? "Sending code" : "Continue"}
      </Button>
    </form>
  )
}

function LoginDialog({
  open,
  onOpenChange,
  title = "Sign in or sign up",
  description,
  onSubmit,
  ...props
}: LoginFormProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="login-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <LoginForm
          {...props}
          onSubmit={async (values) => {
            await onSubmit?.(values)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

export { LoginDialog, LoginForm, LOGIN_PROVIDERS }
export type { LoginProvider, LoginValues }
