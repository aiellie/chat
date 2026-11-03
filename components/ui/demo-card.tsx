"use client"

import * as React from "react"

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type DemoState = {
  /** The state, as its tab says. */
  label: string
  render: () => React.ReactNode
}

/**
 * Something shown in each of its states, one at a time: a tab per state
 * across the top, and the open one drawn on a stage under it. Arrow keys
 * step through them. Only the open state is drawn, so one that runs,
 * like a shimmer, stops once its tab is left.
 */
function DemoCard({
  states,
  className,
}: {
  states: DemoState[]
  className?: string
}) {
  return (
    <Tabs
      data-slot="demo-card"
      defaultValue={0}
      className={cn(
        // A quiet fill rather than a hairline, so a card shown on it isn't
        // a box in a box.
        "min-w-0 gap-0 rounded-xl bg-muted/50",
        className
      )}
    >
      {/* Scrolls sideways once the states run past the card. */}
      <div className="overflow-x-auto border-b border-border/60 p-1.5">
        {/* Arrow keys open each state as they reach it. */}
        <TabsList aria-label="States" activateOnFocus>
          {states.map((state, index) => (
            <TabsTab
              key={state.label}
              value={index}
              className="h-7 shrink-0 px-2.5 text-xs whitespace-nowrap"
            >
              {state.label}
            </TabsTab>
          ))}
        </TabsList>
      </div>
      {states.map((state, index) => (
        <TabsPanel
          key={state.label}
          value={index}
          className="min-h-40 min-w-0 justify-center p-4"
        >
          {state.render()}
        </TabsPanel>
      ))}
    </Tabs>
  )
}

export { DemoCard }
export type { DemoState }
