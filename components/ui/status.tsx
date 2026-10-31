import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusVariants = cva(
  "group/status inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:border-ring motion-reduce:transition-none dark:focus-visible:border-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        success:
          "border-emerald-500/5 bg-emerald-500/4 text-emerald-700 dark:border-emerald-400/5 dark:bg-emerald-400/10 dark:text-emerald-400",
        destructive:
          "border-destructive/5 bg-destructive/4 text-destructive dark:border-destructive/5 dark:bg-destructive/10",
        live: "border-live/5 bg-live/4 text-live dark:border-live/5 dark:bg-live/10 dark:text-live",
        construction:
          "border-yellow-500/5 bg-yellow-500/4 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-400",
      },
    },
    defaultVariants: {
      variant: "live",
    },
  }
)

function Status({
  className,
  variant = "live",
  pulse = false,
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof statusVariants> & {
    pulse?: boolean
  }) {
  const rootProps: useRender.ComponentProps<"span"> &
    Record<`data-${string}`, string> = {
    className: cn(statusVariants({ variant }), className),
    "data-pulse": pulse ? "true" : "false",
  }
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(rootProps, props),
    render,
    state: {
      slot: "status",
      variant,
    },
  })
}

function StatusIndicator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="status-indicator"
      className={cn(
        "relative flex size-1.5 shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 group-data-[pulse=false]/status:hidden motion-reduce:animate-none" />
      <span
        aria-hidden
        className="absolute inline-flex size-full rounded-full border border-current/30"
      />
      <span className="relative inline-flex size-1 rounded-full bg-current" />
    </span>
  )
}

function StatusLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="status-label"
      className={cn("truncate", className)}
      {...props}
    />
  )
}

export { Status, StatusIndicator, StatusLabel, statusVariants }
