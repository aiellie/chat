import type { UIMessage, UIMessageChunk } from "ai"

// Every request a chat made to /api/chat, and every event of its reply, kept
// in memory for the AI debug panel. Nothing is saved: a reload starts over.

type Exchange = {
  id: string
  /** Counted per chat, from 1. */
  number: number
  startedAt: number
  endedAt?: number
  /** The body sent to /api/chat. */
  request: { model?: string; trigger?: string; messages: UIMessage[] }
  state: "streaming" | "done" | "stopped" | "failed"
  httpStatus?: number
  /** Each event of the reply, with its time since the request went out. */
  events: { ms: number; chunk: UIMessageChunk }[]
  error?: string
}

// A chat keeps its newest exchanges; old ones would only use memory.
const KEPT = 30

const NO_EXCHANGES: Exchange[] = []
const exchanges = new Map<string, Exchange[]>()
const listeners = new Set<() => void>()

function getExchanges(chatId: string) {
  return exchanges.get(chatId) ?? NO_EXCHANGES
}

function subscribeExchanges(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Each change makes new arrays, so a snapshot read before it stays as it was.
function change(chatId: string, id: string, edit: (old: Exchange) => Exchange) {
  exchanges.set(
    chatId,
    getExchanges(chatId).map((exchange) =>
      exchange.id === id ? edit(exchange) : exchange
    )
  )
  listeners.forEach((listener) => listener())
}

function begin(chatId: string, request: Exchange["request"]) {
  const list = getExchanges(chatId)
  const exchange: Exchange = {
    id: crypto.randomUUID(),
    number: (list.at(-1)?.number ?? 0) + 1,
    startedAt: performance.now(),
    request,
    state: "streaming",
    events: [],
  }
  exchanges.set(chatId, [...list, exchange].slice(-KEPT))
  listeners.forEach((listener) => listener())
  return exchange
}

/** Reads the reply's server-sent events, one `data:` line each. */
async function record(
  chatId: string,
  exchange: Exchange,
  body: ReadableStream<Uint8Array>
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffered = ""
  const end = (state: Exchange["state"], error?: string) =>
    change(chatId, exchange.id, (old) => ({
      ...old,
      state: old.state === "streaming" ? state : old.state,
      endedAt: old.endedAt ?? performance.now(),
      error: error ?? old.error,
    }))
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffered += decoder.decode(value, { stream: true })
      const events = buffered.split("\n\n")
      buffered = events.pop() ?? ""
      for (const event of events) {
        const data = event
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")
        if (!data || data === "[DONE]") continue
        const chunk = JSON.parse(data) as UIMessageChunk
        const ms = performance.now() - exchange.startedAt
        change(chatId, exchange.id, (old) => ({
          ...old,
          events: [...old.events, { ms, chunk }],
          state:
            chunk.type === "error"
              ? "failed"
              : chunk.type === "abort"
                ? "stopped"
                : old.state,
          error: chunk.type === "error" ? chunk.errorText : old.error,
        }))
      }
    }
    end("done")
  } catch (error) {
    // Stopping the reply cancels the request, which lands here too.
    end(
      error instanceof DOMException && error.name === "AbortError"
        ? "stopped"
        : "failed",
      error instanceof DOMException && error.name === "AbortError"
        ? undefined
        : String(error)
    )
  }
}

/**
 * A `fetch` for the chat's transport that also records the request and a
 * copy of its reply. The reply itself goes on to the chat untouched.
 */
const recordingFetch: typeof fetch = async (input, init) => {
  let request: Exchange["request"] & { id?: string }
  try {
    request = JSON.parse(String(init?.body))
  } catch {
    return fetch(input, init)
  }
  const chatId = request.id ?? "unknown"
  const exchange = begin(chatId, {
    model: request.model,
    trigger: request.trigger,
    messages: request.messages,
  })

  let response: Response
  try {
    response = await fetch(input, init)
  } catch (error) {
    change(chatId, exchange.id, (old) => ({
      ...old,
      state:
        error instanceof DOMException && error.name === "AbortError"
          ? "stopped"
          : "failed",
      error: String(error),
      endedAt: performance.now(),
    }))
    throw error
  }

  change(chatId, exchange.id, (old) => ({
    ...old,
    httpStatus: response.status,
  }))
  if (!response.ok || !response.body) {
    const text = await response.clone().text()
    change(chatId, exchange.id, (old) => ({
      ...old,
      state: "failed",
      error: text || `HTTP ${response.status}`,
      endedAt: performance.now(),
    }))
    return response
  }

  const [ours, theirs] = response.body.tee()
  void record(chatId, exchange, ours)
  return new Response(theirs, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export { getExchanges, recordingFetch, subscribeExchanges }
export type { Exchange }
