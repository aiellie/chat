"use client"

import * as React from "react"
import {
  AiBrain01Icon,
  AudioWave01Icon,
  Building03Icon,
  DashboardSpeed01Icon,
  Database01Icon,
  MoreHorizontalIcon,
  SourceCodeIcon,
  Login03Icon,
  Logout03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  EFFORT_LABELS,
  providerLabel,
} from "@/components/aiellie/model-selector"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DetailList, DetailRow } from "@/components/ui/detail-list"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"
import type { ModelOption } from "@/lib/models"

const tokens = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

// A price per token, as the more readable price per million.
const perMillion = (price: number) =>
  `$${(price * 1_000_000).toLocaleString("en", { maximumFractionDigits: 2 })} / 1M tokens`

/** A model's context, from its row's description too. */
function contextOf(model: ModelOption) {
  return model.contextWindow
    ? `${tokens.format(model.contextWindow)} context`
    : undefined
}

/**
 * A model's details, from its row on the Models page: its id, maker,
 * context, reasoning, fast variant and voice, then what it costs. Only what
 * the Gateway reported for it is shown.
 */
function ModelDetails({ model }: { model: ModelOption }) {
  const efforts = model.efforts
    ?.filter((effort) => effort !== "none")
    .map((effort) => EFFORT_LABELS[effort])
  const pricing = model.pricing

  return (
    <Dialog>
      <DialogTrigger
        render={
          <TooltipIconButton
            tooltip="Details"
            side="left"
            // Shows as the row is hovered, and always on touch, where nothing
            // hovers. It stays while focused or while its dialog is open.
            className="opacity-0 transition-[opacity,scale] group-focus-within/item:opacity-100 group-hover/item:opacity-100 data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
          />
        }
      >
        <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{model.name}</DialogTitle>
          <DialogDescription>
            {[providerLabel(model.id), contextOf(model)]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>
        <DetailList title="Details">
          <DetailRow
            icon={SourceCodeIcon}
            label="ID"
            value={model.id}
            className="font-mono"
          />
          <DetailRow
            icon={Building03Icon}
            label="Provider"
            value={providerLabel(model.id)}
          />
          {model.contextWindow ? (
            <DetailRow
              icon={Database01Icon}
              label="Context"
              value={
                model.contexts
                  ? model.contexts.map((size) => tokens.format(size)).join(", ")
                  : `${tokens.format(model.contextWindow)} tokens`
              }
            />
          ) : null}
          {efforts?.length ? (
            <DetailRow
              icon={AiBrain01Icon}
              label="Reasoning"
              value={efforts.join(", ")}
            />
          ) : null}
          {model.fastId ? (
            <DetailRow
              icon={DashboardSpeed01Icon}
              label="Fast"
              value={model.fastId}
              className="font-mono"
            />
          ) : null}
          {model.voice ? (
            <DetailRow
              icon={AudioWave01Icon}
              label="Voice chat"
              value={model.voice.name}
            />
          ) : null}
        </DetailList>
        {pricing ? (
          <DetailList title="Pricing">
            <DetailRow
              icon={Login03Icon}
              label="Input"
              value={perMillion(pricing.input)}
            />
            <DetailRow
              icon={Logout03Icon}
              label="Output"
              value={perMillion(pricing.output)}
            />
            {pricing.cacheRead !== undefined ? (
              <DetailRow
                icon={Database01Icon}
                label="Cached input"
                value={perMillion(pricing.cacheRead)}
              />
            ) : null}
          </DetailList>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export { contextOf, ModelDetails }
