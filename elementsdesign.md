---
name: elements-design
description: How to design and build a new element in the chat, such as a tool's card in the thread, a status or a live indicator, with the app's own tokens, components, live colour and motion. Use before building any tool UI.
---

# Elements design

This file is the procedure for designing a new element so it looks like it shipped with the app. An element is anything drawn in the thread that isn't the reply's words: a tool's card, a trace line, a status, an indicator.

- **Values** live in `app/globals.css`. **Rules** live in `design.md`. This file doesn't repeat them; it turns them into steps and class strings.
- The live and motion rules are adapted from assistant-ui's `design.md`, with our brand in place of their blue.
- Build only from `components/ui/` and `components/aiellie/`. A new element never brings its own dot, spinner, fold or menu.

## 1. Brand is live

The brand colour, **#5170FF**, is the `--live` token (`oklch(0.603 0.215 269.582)`, the same in both themes). It replaces assistant-ui's `blue-500` and means exactly what their blue means: **streaming, running, connected, or switched on.**

- **No live thing, no brand.** The brand is never decoration: not a button at rest, a heading, a link, a border, an icon or a selected tab. If nothing in the view is happening, the view has no brand in it.
- **One live thing per view.** A tool that's running is the live thing while it runs. The thread already gives way to it: the thinking indicator hides while anything in the message has `data-status="running"`, so put that attribute on your element's root while it works.
- **The brand stops when the state does.** A result that has landed, a call that ended, a toggle turned off: the brand goes at once, with no fade-out.
- **Always the token:** `text-live`, `bg-live/4`, `hover:bg-live/7`, `border-live/20`. Never a hex, never `blue-*`, never `primary` used to mean "brand".
- **Contrast.** #5170FF is 4.1:1 on white, so in the light theme it clears 3:1 for marks (dots, the caret, rings, icons, fills) but not 4.5:1 for small text. Use brand ink on a word only where the word is brief and paired with a mark, like a `Status` label beside its dot, or passing, like a streamed word settling. Never for body copy or links.

## 2. Map every state before drawing anything

A tool's part in the thread moves through the AI SDK's states. Decide what each one looks like first. This table is the default; an element changes a row only for a reason it can say out loud.

| State                | What it shows                                                                                                                             | Brand?           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `input-streaming`    | The card's frame with a `Skeleton` in the result's shape, and a caption naming the work ("Checking the weather").                         | Caption shimmers |
| `input-available`    | The same, now with the input shown ("Checking the weather in Lisbon"). Root gets `data-status="running"` and `aria-busy`.                 | Yes              |
| `approval-requested` | The settled request, fully readable, with its actions. Waiting on a person isn't machine work, so it's neutral: `Status variant="muted"`. | No               |
| `approval-responded` | Actions replaced by the running caption until the result arrives.                                                                         | Yes              |
| `output-available`   | The result. No loops, no brand, nothing moving.                                                                                           | No               |
| `output-error`       | The card keeps its frame. `Status variant="destructive"` with "Failed", then the reason as a sentence, then Retry if there is one.        | No               |
| `output-denied`      | The request in `muted-foreground` with a word saying what didn't happen ("Not sent").                                                     | No               |

A result loaded from history renders straight into its settled state: no skeleton, no entrance, no brand.

## 3. Pick the shape

- **Trace line** (`Trace`, `TraceLine`, `TraceTitle` from `components/aiellie/trace.tsx`): when the tool's result is evidence for the reply, like a search. One quiet line that folds open. `web-search.tsx` is the reference.
- **Card**: when the result is the answer, or needs a decision. `plan-review.tsx` is the reference.
- **Inline status** (`Status`): when all there is to say is a state.

## 4. Card anatomy

A card in the thread is **docked**, so it's flat: a hairline, no fill, no shadow.

```tsx
<div
  data-slot="weather-card"
  data-status={running ? "running" : undefined}
  aria-busy={running || undefined}
  className="flex w-full min-w-0 flex-col gap-4 rounded-xl border border-border/60 p-4 text-sm"
>
  {/* Caption row: what it is at the start, its state at the end. */}
  <header className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
    <span className={cn("min-w-0 truncate", running && "shimmer motion-reduce:animate-none")}>
      {caption}
    </span>
    <span className="ms-auto shrink-0">{state}</span>
  </header>
  {/* The main value, then the detail. */}
</div>
```

- **Hierarchy comes from size, not weight.** Weights are capped at 430, so `font-semibold` reads as `font-medium`. A headline number is `text-4xl tabular-nums`; its label is `text-xs text-muted-foreground`.
- **Gap, not margin.** The card is `gap-4`; groups inside it `gap-1` or `gap-2`. No `mt-*` between children.
- **Padding shrinks as you nest:** the card `p-4`, a block inside it `p-3`, a chip `px-2`. A nested corner is the parent's radius minus the padding.
- **Numbers** use `tabular-nums` and carry their unit ("18°C", "14 km/h").
- **Anything that floats from the card** (a hover card, a menu) is glass and lifts: the `floating` string in `components/ui/surfaces.tsx`. Inside a dialog it's solid.

## 5. Components to reach for

Use these names before writing markup. Extend one with a prop before adding a sibling.

| Need                                  | Use                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A state with a word                   | `Status` + `StatusIndicator` + `StatusLabel`, `variant` live, success, destructive or muted; `pulse` while running |
| Loading with a known shape            | `Skeleton`, sized like the content it stands for                                                                  |
| A running label                       | the `shimmer` class, or `ShimmerLabel`                                                                            |
| Work under way with no shape yet      | `ThinkingIndicator`, named for the work ("Searching")                                                             |
| A label that changes in place         | `SwapLabel` (blurs one label into the next and eases the width)                                                   |
| An icon that changes in place         | `iconSwap` with `iconSwapIn` and `iconSwapOut`                                                                    |
| A region that folds                   | `Collapsible` with `collapsePanel`, or the trace's fold                                                           |
| Actions                               | `Button`: `default` for the main action, `ghost` or `outline` beside it, `destructive` only when it destroys      |
| Rows of facts                         | `DetailList` and `DetailRow`, or `Item`                                                                           |
| A filled field or row                 | `field` or `fieldInteractive`                                                                                     |
| An icon-only control                  | a `Button` size `icon-*` inside a `Tooltip`, with an `aria-label`                                                 |

Don't use the `live` and `error` strings in `surfaces.tsx`: `live` is drawn in `accent`, which is grey. Use `Status` instead.

## 6. Motion recipes

Every motion explains a state change, keeps continuity, or confirms an action. Durations are **80 ms** (the pointer acting directly), **150 ms** (a toggle, a label swap, a small layer arriving), **280 ms** (a fold, a panel, a dialog) and **70 ms** between staggered items. Curves are ease-out `cubic-bezier(0.16,1,0.3,1)` for entering and ease-in `cubic-bezier(0.4,0,1,1)` for leaving. Every transition carries `motion-reduce:transition-none` and every animation `motion-reduce:animate-none`, on the same element.

| Moment                             | Recipe                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading becomes the result         | The skeleton has the result's shape, so the swap is instant and nothing jumps. No entrance animation on the result.                       |
| The caption changes                | `SwapLabel`: "Checking the weather" blurs into "Weather" at 150 ms.                                                                         |
| Running                            | `shimmer` on the caption and `Status pulse` on its dot. Both stop the moment the result lands.                                            |
| A press                            | `Button` already dents: `active:scale-[0.97]`, icon buttons `active:scale-90`, at 80 ms. Nothing grows on hover.                          |
| A row's hover                      | `transition-colors duration-80 hover:bg-foreground/[0.04] motion-reduce:transition-none`                                                  |
| A done tick replacing an icon      | `iconSwap`, 150 ms, then back.                                                                                                             |
| Details folding open               | `collapsePanel` (height, 280 ms), with the trigger's chevron turning 90° at 150 ms.                                                        |
| A few items arriving live together | `animate-in fade-in slide-in-from-bottom-1 duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] fill-mode-both motion-reduce:animate-none`, delay `index × 70ms`. Three to five items, never a list. |
| Streamed words                     | `Response` or `StreamText`. Each word lands in brand ink (`sd-liveIn`) and settles. Never hand-roll a stream.                              |

Never: a spinner where a skeleton fits, a loop on a settled result, an entrance on anything loaded from history, `transition-all`, Tailwind's own `ease-out`, or a new keyframe that isn't added to the tables in `design.md`.

## 7. Copy

- The running caption names the work and its input: "Checking the weather in Lisbon", "Searching npm for date pickers". Never "Loading".
- The settled caption names the thing: "Weather", "Email to Sam".
- An error says why and what to do: "Couldn't find a place called Zxqvbland." Not "Something went wrong."
- Actions say what they do: "Send email", "Don't send", "Retry".
- Sentence case. No "simply", "just", "seamlessly".

## 8. Accessibility

- The root has `aria-busy` while it works. A caption that changes as work progresses is a `role="status"` once, not on every element inside it.
- A state is never told by colour alone: every `Status` has a word or an icon.
- Controls are real `Button`s with the `focus-visible:ring-2 focus-visible:ring-ring` ring. Once a decision is made, its buttons go: a settled card offers nothing that does nothing.
- Decorative icons are `aria-hidden`; an icon that carries meaning has a label.
- Sortable headers are buttons inside a `th` with `aria-sort`.

## 9. Steps

1. **List the states** the element can reach, using the table in section 2.
2. **Pick the shape:** trace line, card or status.
3. **Sketch the anatomy** in words and list which components from section 5 it reuses.
4. **Build the happy path,** then every other state, with the skeleton in the result's shape.
5. **Place the brand:** where is it now? It should be in exactly one place, and only while something runs.
6. **Motion pass:** give each motion a job, a duration and a curve from section 6, and its reduced-motion escape.
7. **Copy pass** against section 7.
8. **Done.** Render it and look:
   - every state, including a forced error;
   - both themes;
   - phone width with device emulation;
   - keyboard only;
   - reduced motion switched on;
   - a reload, so the result comes from history: settled, no brand, nothing moving;
   - the squint test: one thing clearly dominant.

## Reject these

- The brand as decoration: brand buttons, brand headings, a brand border on a card at rest.
- Two live things at once.
- Pill-shaped tool calls, a coloured tile behind every icon, gradients, glows.
- A box in a box: a card inside the card.
- A spinner alone where the content's shape is known.
- Activity marks (a pulsing dot, a shimmer) on anything that isn't machine work happening now.
- A mock-up in place of the real thing: the element is shown working, with real data.
