import { PROVIDERS } from "@/lib/api-keys"
import type { Route } from "@/lib/providers"

// Server only: why a reply failed, said so the person knows what to do next.
// It takes the place of the AI SDK's own "An error occurred.", which hides
// the reason. It goes by what the provider or the Gateway answered, never
// the server's own details.

/** The HTTP status the provider or the Gateway answered with, if one did. */
function statusOf(error: unknown) {
  return error instanceof Object &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
    ? error.statusCode
    : undefined
}

function failureReason(error: unknown, route: Route) {
  const message = error instanceof Error ? error.message : ""
  const key =
    route.via === "gateway"
      ? "The AI Gateway key"
      : `The ${PROVIDERS.find(({ id }) => id === route.provider)?.name ?? route.provider} key`
  const status = statusOf(error)

  if (status === 401)
    return route.via === "gateway" && /no (api key|auth)/i.test(message)
      ? "No AI Gateway key is set. Add one in API keys."
      : `${key} was refused. Check it in API keys.`
  if (status === 402) return `${key} is out of credit.`
  if (status === 403) return `${key} isn't allowed to use this model.`
  if (status === 404) return "This model isn't available with this key."
  if (status === 429)
    return "Too many requests for now. Wait a moment, then retry."
  if (/context (length|window)|too long|maximum.*tokens/i.test(message))
    return "The conversation is too long for this model. Start a new chat, or pick a model with a larger context."
  if (status !== undefined && status >= 500)
    return "The model's provider had a problem. Retry in a moment."
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message))
    return "The model couldn't be reached. Retry in a moment."
  return "The model stopped with an error. Retry, or pick another model."
}

export { failureReason }
