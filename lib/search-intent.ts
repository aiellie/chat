// Whether a message asks for the web to be searched, so search can be turned
// on for it without the toggle. A match that wasn't meant (say, "binary
// search") costs little: the model is only given the search, not made to use
// it.

const ASKS = [
  // "search for…", "search the web", "do a search", "web search"
  /\bsearch(es|ed|ing)?\b/i,
  // "look up…", "look it up", "lookup"
  /\blook\s*(it|this|that|them)?\s*-?\s*up\b/i,
  // "google it", "google the…"
  /\bgoogle\b/i,
  // "browse the web", "find it online", "check on the internet"
  /\b(browse|online|on the (web|internet))\b/i,
  // "latest news", "today's headlines", "current prices"
  /\b(latest|current|today'?s|breaking|recent)\s+(news|headlines|prices?|scores?|results?|updates?|version|release)\b/i,
]

// "Search" as a thing to build or a part of an app, not a request to search:
// "binary search", "the search bar", "a search algorithm".
const NOT_ASKING =
  /\b(binary|linear|depth[- ]first|breadth[- ]first|full[- ]text|fuzzy|vector|semantic)\s+search\b|\bsearch\s+(bar|box|input|field|function|algorithm|index|params?|results? page|component|page|query param)\b/gi

function asksToSearch(text: string) {
  const asked = text.replace(NOT_ASKING, " ")
  return ASKS.some((pattern) => pattern.test(asked))
}

export { asksToSearch }
