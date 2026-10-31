"use client"

import * as React from "react"
import { ArrowUp02Icon, StopIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

function Composer({
  busy = false,
  onSend,
  onStop,
}: {
  /** While a reply streams, the send button becomes a stop button. */
  busy?: boolean
  onSend: (text: string) => void
  onStop?: () => void
}) {
  const [input, setInput] = React.useState("")

  const submit = () => {
    const text = input.trim()
    if (!text || busy) return
    onSend(text)
    setInput("")
  }

  return (
    <form
      className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          aria-label="Message"
          placeholder="Message"
          rows={1}
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter breaks the line.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              submit()
            }
          }}
          className="max-h-48"
        />
        <InputGroupAddon align="block-end" className="justify-end">
          {busy ? (
            <InputGroupButton
              variant="secondary"
              size="icon-sm"
              onClick={onStop}
            >
              <HugeiconsIcon icon={StopIcon} aria-hidden />
              <span className="sr-only">Stop</span>
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              disabled={!input.trim()}
            >
              <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

export { Composer }
