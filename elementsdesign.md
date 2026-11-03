---
name: elements-design
description: How to design and build a new element for the chat app (a control, a surface, an indicator, a message part, or a tool's card in the thread) with the app's own tokens, components, live colour and motion. Use before building any UI element.
---

# Elements design

This file is the procedure for designing a new element so it looks like it shipped with the app. An element is any piece of UI: a control, a surface, an indicator, a part of a message, or a tool's card in the thread.

- **Values** live in `app/globals.css`. **Rules** live in `design.md`. This file doesn't repeat them; it turns them into steps and class strings.
- The live and motion rules are adapted from assistant-ui's `design.md`, with our brand in place of their blue.
- Build only from `components/ui/` and `components/aiellie/`. A new element never brings its own dot, spinner, fold or menu.
- Part 1 applies to every element. Part 2 adds what a tool's part in the thread needs. The checklist at the end splits the same way.

# Part 1: Every element

## 1. Brand is live

The brand colour, **#5170FF**, is the `--brand` token (`oklch(0.603 0.215 269.582)`, the same in both themes), and `--live` carries it. It replaces assistant-ui's `blue-500` and means exactly what their blue means: **something happening now.** That covers four cases:

- **streaming:** a reply being written, its newest words and its caret;
- **running:** machine work under way, like a tool fetching;
- **connected:** a session that's open, like a voice call;
- **switched on:** a toggle or mode that's on right now.

Rules:

- **No live thing, no brand.** The brand is never decoration: not a button at rest, a heading, a link, a border, an icon or a hover. If nothing in the view is happening, the view has no brand in it.
- **One live thing per view.** The parts of one live thing may share the ink, like a streaming reply's words and its caret. Two separate things in brand at once compete; take it off the one that isn't the subject.
- **The brand stops when the state does.** Finished, ended, switched off: the brand goes at once, with no fade-out.
- **Always the token:** `text-live`, `bg-live/4`, `hover:bg-live/7`, `border-live/20`. Never a hex, never `blue-*`, never `primary` used to mean "brand".
- **`brand` or `live`?** `--brand` holds the colour; `--live` is the same colour with a meaning. An element writes `live`, so the code says why it's blue. `text-brand` is only for the brand itself, like the logo.
- **Contrast.** #5170FF is 4.1:1 on white, so in the light theme it clears 3:1 for marks (dots, the caret, rings, icons, fills) but not 4.5:1 for small text. Put brand ink on a word only where the word is brief and paired with a mark, like a `Status` label beside its dot, or passing, like a streamed word settling. Never on body copy or links.

## 2. List the states

Before drawing anything, list every state the element can be in. Most elements need some of these:

| State          | What it looks like                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Rest           | Neutral: zinc tokens, no brand.                                                                                          |
| Hover          | A fill or ink change only, at 80 ms. Nothing grows.                                                                      |
| Focus          | The `focus-visible` ring (section 7). Never on click.                                                                    |
| Pressed        | A dent: `active:scale-[0.97]`, or `active:scale-90` for an icon button.                                                  |
| Disabled       | `disabled:opacity-50`, and it can't be reached by the pointer. It stays in place so nothing shifts.                      |
| Open           | A trigger stays marked while what it opens is open (`aria-expanded:bg-muted`), and its icon turns.                       |
| Loading        | A `Skeleton` in the content's shape if the shape is known; otherwise the activity grammar, naming the work.              |
| Live           | Brand ink in one place, per section 1.                                                                                   |
| Empty          | The slot stays empty, or one line saying what will appear there. No illustration, no slogan.                             |
| Error          | `Status variant="destructive"` with "Failed", then why, then a way to retry.                                             |
| Done           | `success` ink with a word or a tick, only for "completed, passing or saved", and only where the person needs to know.    |

Waiting on the person (an approval, an answer they owe) is `Status variant="pending"`, amber, with a dot that doesn't pulse. Anything else (queued, draft, idle) is neutral: `Status variant="muted"`. There is no fifth hue.

## 3. Surfaces and layout

- **Docked or floating?** A docked element (a card, a field, a row, a button) is flat: a hairline and its ground, no shadow. A floating one (a menu, popover, hover card, tooltip) is glass with `shadow-md`: the `floating` string in `components/ui/surfaces.tsx`. A panel over a scrim (a dialog, a sheet) is solid with `shadow-lg`. Inside a dialog, a floating layer is solid.
- **Hierarchy comes from size, not weight.** Weights are capped at 430, so `font-semibold` reads as `font-medium`. Make the important thing bigger and the rest `text-xs text-muted-foreground`.
- **Gap, not margin.** Spacing belongs to the container. A component never carries an outside margin.
- **Padding shrinks as you nest:** an outer surface `p-4`, a block inside it `p-3`, a chip `px-2`. A nested corner is the parent's radius minus the padding.
- **One radius family per row.** `rounded-full` only for true circles and capsules. Nothing clickable is rounder than `rounded-xl`.
- **Lines only where they help.** Rows are separated by spacing and a hover fill. Never a box in a box.
- **Numbers** use `tabular-nums` and carry their unit.

## 4. Components to reach for

Use these names before writing markup. Extend one with a prop before adding a sibling.

| Need                             | Use                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A state with a word              | `Status` + `StatusIndicator` + `StatusLabel`, `variant` live, success, destructive, pending or muted; `pulse` while running |
| Loading with a known shape       | `Skeleton`, sized like the content it stands for                                                                   |
| A running label                  | the `shimmer` class, or `ShimmerLabel`                                                                             |
| Work under way with no shape yet | `ThinkingIndicator`, named for the work ("Searching")                                                              |
| A label that changes in place    | `SwapLabel` (blurs one label into the next and eases the width)                                                    |
| An icon that changes in place    | `iconSwap` with `iconSwapIn` and `iconSwapOut`                                                                     |
| A region that folds              | `Collapsible` with `collapsePanel`                                                                                 |
| Actions                          | `Button`: `default` for the main action, `ghost` or `outline` beside it, `destructive` only when it destroys       |
| An icon-only control             | a `Button` size `icon-*` inside a `Tooltip`, with an `aria-label`                                                  |
| A menu or popover                | `Menu`, `Popover`; a search at the top of a menu is `MenuSearch`                                                   |
| A dialog                         | `Dialog`, or `AlertDialog` to confirm something destructive                                                        |
| Rows of facts                    | `DetailList` and `DetailRow`, or `Item`                                                                            |
| A filled field or row            | `field` or `fieldInteractive`                                                                                      |
| A toggle                         | `Switch`; when it's on, it's live                                                                                  |

## 5. Motion

Every motion explains a state change, keeps continuity, or confirms an action. Motion never holds text back from being read.

- **Durations:** **80 ms** for what the pointer does directly (a press, a hover), **150 ms** for a toggle, a label swap or a small layer arriving, **280 ms** for a fold, a panel or a dialog, and **70 ms** between staggered items.
- **Curves:** ease-out `cubic-bezier(0.16,1,0.3,1)` for entering and answering input, ease-in `cubic-bezier(0.4,0,1,1)` for leaving. Not Tailwind's own `ease-out`.
- **Reduced motion:** every transition carries `motion-reduce:transition-none` and every animation `motion-reduce:animate-none`, on the same element. Motion driven from JavaScript checks `matchMedia("(prefers-reduced-motion: reduce)")` itself.

| Moment                             | Recipe                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A press                            | `Button` already dents: `active:scale-[0.97]`, icon buttons `active:scale-90`, at 80 ms.                                                                                                        |
| A row's hover                      | `transition-colors duration-80 hover:bg-foreground/[0.04] motion-reduce:transition-none`                                                                                                        |
| A trigger's icon                   | Turns at 150 ms while open: a chevron 180°, a plus 45°, a fold's chevron 90°.                                                                                                                   |
| A label changing in place          | `SwapLabel`, 150 ms.                                                                                                                                                                            |
| An icon changing in place          | `iconSwap`, 150 ms, like Copy turning into a tick and back.                                                                                                                                     |
| A region appearing inside a layout | Fold, don't pop: `collapsePanel`, or `grid-template-rows` from `0fr` to `1fr` at 280 ms, `inert` while shut.                                                                                    |
| A floating layer arriving          | `animate-in` and `animate-out` from tw-animate-css, as `Menu` and `Popover` already do.                                                                                                         |
| A few items arriving together      | `animate-in fade-in slide-in-from-bottom-1 duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] fill-mode-both motion-reduce:animate-none`, delay `index × 70ms`. Three to five items, never a list. |
| Working                            | `shimmer` on the label, `Status pulse` on its dot, `animate-pulse` on a skeleton. All stop when the work does.                                                                                  |
| Streamed words                     | `Response` or `StreamText`. Each word lands in brand ink (`sd-liveIn`) and settles. Never hand-roll a stream.                                                                                   |

Never: a spinner where a skeleton fits, a loop on something settled, an entrance on anything already on the page at load, `transition-all`, growth on hover, scroll-triggered reveals, or a new keyframe that isn't added to the tables in `design.md`.

## 6. Copy

- Every string names a control, states a fact the person needs, or says what happens next. Delete one that does none of these.
- A control says what it does: "Send email", "Copy", "Retry".
- Work in progress names the work: "Searching", "Connecting". Never "Loading".
- An error says why and what to do: "The API key was refused. Add a new one in Settings." Not "Something went wrong."
- Sentence case. No slogans or reassurance in chrome, and no "simply", "just" or "seamlessly".

## 7. Accessibility

- Keyboard focus only: `outline-none focus-visible:ring-2 focus-visible:ring-ring` for controls; fields turn their border instead with `focus-visible:border-ring`.
- A state is never told by colour alone: every `Status` has a word or an icon.
- Controls are real buttons, links or inputs, never a clickable `div`.
- An icon-only control has a `Tooltip` and an `aria-label`. Decorative icons are `aria-hidden`.
- Something working has `aria-busy`. Text that changes as work goes on is announced once with `role="status"`, not on every element inside it.
- A control that does nothing right now is disabled or gone, never live-looking.

## 8. Steps

1. **List the states** (section 2).
2. **Decide docked or floating** and sketch the layout in words (section 3).
3. **List the components** it reuses (section 4).
4. **Build the main state,** then every other state.
5. **Place the brand:** is anything live? If so, the brand is in exactly one place while it is; if not, there's no brand.
6. **Motion pass** (section 5), then **copy pass** (section 6).
7. **Add it to the Elements page:** an entry in `app/elements/demos.tsx` with a state for each row of its state table, and a "Try it" state where it takes input.
8. **Run the checklist** at the end of this file, looking at it on the Elements page.

## 9. Reject these

- The brand as decoration: brand buttons, brand headings, a brand border at rest.
- Two live things at once.
- A coloured tile behind every icon, rainbow badges, gradients, glows, blobs. A tool's mark (`ToolMark`) is the one tinted tile.
- A box in a box, or a card around every section.
- Tiny muted text used to make density fit.
- A spinner alone where the content's shape is known.
- Activity marks (a pulsing dot, a shimmer) on anything that isn't happening now.
- A mock-up in place of the real thing: the element is shown working, with real data.

# Part 2: Tool elements

A tool element is a tool's part in the thread: what the reply shows while the tool runs and after. Everything in Part 1 applies; this adds the rest.

## 10. Tool states

A tool's part moves through the AI SDK's states. This table is the default; change a row only for a reason you can say out loud.

| State                | What it shows                                                                                                                             | Brand?           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `input-streaming`    | The frame with a `Skeleton` in the result's shape, and a caption naming the work ("Checking the weather").                                | Caption shimmers |
| `input-available`    | The same, now with the input shown ("Checking the weather in NYC"). Root gets `data-status="running"` and `aria-busy`.                 | Yes              |
| `approval-requested` | The settled request, fully readable, with its actions. Waiting on the person: `Status variant="pending"`, amber, no pulse.                          | No               |
| `approval-responded` | Actions replaced by the running caption until the result arrives.                                                                         | Yes              |
| `output-available`   | The result. No loops, no brand, nothing moving.                                                                                           | No               |
| `output-error`       | The frame stays. `Status variant="destructive"` with "Failed", then the reason as a sentence, then Retry if there is one.                 | No               |
| `output-denied`      | The request in `muted-foreground` with a word saying what didn't happen ("Not sent").                                                     | No               |

- `data-status="running"` on the root matters: the thread hides its thinking indicator while anything in the message is running, so the tool stays the one live thing.
- A result loaded from history renders straight into its settled state: no skeleton, no entrance, no brand.
- The skeleton has the result's shape, so loading turns into the result instantly, with nothing jumping and no entrance animation.

## 11. Pick the shape

- **Trace line** (`Trace`, `TraceLine`, `TraceTitle` from `components/aiellie/trace.tsx`): when the result is evidence for the reply, like a search. One quiet line that folds open. `web-search.tsx` is the reference.
- **Card:** when the result is the answer, or needs a decision. `plan-review.tsx` is the reference.
- **Inline status** (`Status`): when all there is to say is a state.

## 12. Card anatomy

A tool card is docked, so it's flat: a hairline, no fill, no shadow.

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

- The main value is the biggest thing: a headline number is `text-4xl tabular-nums`.
- The caption changes with `SwapLabel` when the work finishes ("Checking the weather" becomes "Weather").
- Once a decision is made, its buttons go. A settled card offers nothing that does nothing.

## 13. Tool copy

- The running caption names the work and its input: "Checking the weather in NYC", "Searching npm for date pickers".
- The settled caption names the thing: "Weather", "Email to Sam".
- An error names what failed: "Couldn't find a place called Zxqvbland."
- Approval actions say what happens: "Send email" and "Don't send", not "Yes" and "No".

## 14. Where the files go

The tool itself lives in `lib/tools/`, gets a place in `chatTools`, and an entry in `catalog.ts`. Its element goes in `components/aiellie/`, and `thread.tsx` draws it by `part.type` and `part.state`. `AGENTS.md` has the full pattern.

# Checklist

Tick every line before calling an element done. A "no" is either fixed or written down with its reason.

## Every element

### States (section 2)

- [ ] Every state the element can reach is listed, and each one has been seen in the browser.
- [ ] Loading shows a `Skeleton` in the content's shape, or names the work if there's no shape yet.
- [ ] Empty and error states exist where they can happen, and the error says why.
- [ ] Disabled controls stay in place, so nothing shifts.

### Brand (section 1)

- [ ] The brand appears only while something is streaming, running, connected or switched on.
- [ ] At most one live thing in the view.
- [ ] Brand ink is written as `live` (`text-live`, `bg-live/4`), never a hex, `blue-*` or `brand-*`.
- [ ] Brand ink is never on body copy or links.

### Surfaces and layout (section 3)

- [ ] Docked elements are flat; only floating ones have glass and a shadow.
- [ ] Hierarchy comes from size; numbers are `tabular-nums` with their units.
- [ ] Spacing is `gap` on the container, with no outside margins, and padding shrinks as it nests.
- [ ] Nested corners are the parent's radius minus the padding, and nothing clickable is rounder than `rounded-xl` unless it's a circle or capsule.
- [ ] No box in a box.

### Components (section 4)

- [ ] Every state, dot, skeleton, button, fold, menu and dialog is an existing component, not new markup.
- [ ] Nothing in `components/aiellie/` imports the app's own files or calls `/api/`.

### Motion (section 5)

- [ ] Every motion has a job: a state change, continuity, or confirming an action.
- [ ] Every duration is 80, 150, 280 or 70 ms, and every curve is one of the two in `design.md`.
- [ ] Every transition has `motion-reduce:transition-none` and every animation `motion-reduce:animate-none`, on the same element.
- [ ] Loops run only while something is working and stop when it's done.
- [ ] No `transition-all`, nothing grows on hover, nothing already on the page animates in.

### Copy (section 6)

- [ ] Every string names a control, states a needed fact, or says what happens next.
- [ ] Every control says what it does, in sentence case.
- [ ] Nothing says "Loading" or "Something went wrong".

### Accessibility (section 7)

- [ ] Every control can be reached and used by keyboard, with the `focus-visible` ring.
- [ ] No state is shown by colour alone.
- [ ] Icon-only controls have a tooltip and an `aria-label`; decorative icons are `aria-hidden`.
- [ ] Anything working has `aria-busy`, and changing text is announced once.

### Look at it

- [ ] It's on the Elements page with every state, and each one renders.
- [ ] Light and dark.
- [ ] Phone width, with device emulation.
- [ ] Keyboard only.
- [ ] Reduced motion switched on.
- [ ] Squint: one thing is clearly dominant.
- [ ] Nothing from the reject list.

## Tool elements, as well

- [ ] Every tool state it can reach (section 10) has been seen, including a forced error.
- [ ] While running, the root has `data-status="running"` and `aria-busy`, and the brand is only on the caption's dot and shimmer.
- [ ] Once settled, there's no brand, no shimmer and nothing moving.
- [ ] Reloading shows the result from history settled, with no skeleton and no entrance.
- [ ] The shape fits the job: trace line for evidence, card for an answer or a decision, `Status` for a state alone.
- [ ] A card is `rounded-xl border border-border/60 p-4`, no fill, no shadow, with a caption row naming it and showing its state.
- [ ] The running caption names the work and its input; the settled caption names the thing.
- [ ] Once a decision is made, its buttons are gone or disabled.
- [ ] The tool has its file in `lib/tools/`, a place in `chatTools`, and an entry in `catalog.ts`.
