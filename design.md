# Design

How this chat template looks and behaves. The chat parts in `components/aiellie/` are installable on their own as the `@aiellie` registry; the app in `components/` wires them together. Where a component goes is decided by the test in `AGENTS.md`.

Values live in `app/globals.css`; this file says what they mean and when to reach for them. If the two disagree, `globals.css` is the value and this file is the intent. Fix whichever is wrong.

## Honesty

- Never draw a capability, number, model or page that doesn't exist today. No "soon", no roadmap tense, no placeholder rows, no metric nobody measured.
- A control appears only where it works. The voice button shows only for a model whose maker has a realtime model the Gateway key can reach.
- When a number fails to load, show the sentence without it, never a plausible value.

## Foundations

What `globals.css` holds. There is no type scale and no extra size tokens.

- **Type.** Geist for everything; Geist Mono only for code, keys, ids and paths. Both load through `next/font/google` in `app/layout.tsx`.
- **Weights** keep Tailwind's names, with capped values: thin 100, extralight 200, light 300, normal 400, medium 430, and semibold, bold, extrabold and black all 450. An inherited component marked `font-bold` comes out quiet without editing its class string.
- **Radius.** The base `--radius` is 14px (0.875rem). The steps derive from it the way shadcn's do: `sm` 0.6×, `md` 0.8×, `lg` 1×, `xl` 1.4×, `2xl` 1.8×, `3xl` 2.2×, `4xl` 2.6×.
- **Colour.** Zinc neutrals on shadcn's semantic names carry the interface. Hue appears only for a status: `destructive`, `live`, `success` and `pending`. `live` is the one accent, and it is the brand colour, #5170FF.
- **Focus.** `--ring` is the focus colour, zinc at L 0.64 in light and 0.552 in dark, chosen to clear 3:1 on every surface.
- **Global base**, set once in `globals.css` and never per component: a pointer cursor on enabled buttons, `overscroll-y-none` and smooth scrolling on `html`, and scrollbars drawn as the `border` hairline on no track.
- **Themes.** Light and dark are both complete. Check both.

## Live and status

### Live

`live` means streaming, running, connected, or switched on: something happening now.

- **No live thing, no blue.** Blue is never decoration: not a highlight, not a caret in a field, not a flash confirming an edit.
- **One live thing per view.** The parts of one live thing may share the ink, like a streaming reply's newest words and its caret. Two separate things in `live` at once compete; take the hue off the one that isn't the subject.
- **Blue stops when the state does.** A settled reply, an ended call or a toggle turned off loses its `live` at once.
- **Always the token.** `text-live`, `bg-live/4`, `hover:bg-live/7`, `border-live/20`; never a blue shade or a hex. That includes the voice orb, whose colours are mixed from `--live` at runtime.
- **Voice.** During a call the orb is the live thing, and the call's spoken marks and its "Voice chat" label share its ink. When the call ends they turn `muted-foreground`.

### Status

Four statuses, built the same way: an ink and a fill, 4% at rest and 7% on hover, only when the thing is clickable.

```
bg-destructive/4 text-destructive              a badge or row
bg-destructive/4 hover:bg-destructive/7        the same thing, clickable
```

- `destructive` means failed, failing, or about to be destroyed. `success` means completed, passing or saved. Neither is used to draw the eye or decorate.
- `pending` (amber) means waiting on the person: an approval, an answer they owe. It never pulses, since nothing is working; that's `live`.
- Anything else (queued, draft, idle) is neutral: a `muted` fill and `muted-foreground` ink. There is no fifth hue.
- Never show a state by hue alone. Every status carries a word or an icon too.

## Surfaces

### Glass

Anything that floats over the page without dimming it (menus, popovers, hover cards, the main header) is translucent: one fill plus one blur, always the same.

```
bg-popover supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/70 backdrop-blur-xs
```

- The opaque `bg-popover` comes first, so a browser without `backdrop-filter` gets a solid surface.
- One layer of glass at a time. A menu opened inside a dialog is solid.
- A panel over a scrim (a dialog, a sheet) is solid, never glass.
- A floating panel whose own content scrolls under sticky labels is solid, since a label has to hide what passes under it. The emoji picker is the one today. Making a glass surface solid means replacing its `supports-[backdrop-filter]:` fills as well as `bg-popover`, or the glass fill still wins wherever blur is supported.
- Glass keeps its `border` hairline, since the fill alone doesn't say where the surface ends.
- A header that content scrolls under is glass laid over the content, not stacked above it. The chat's main header is the reference: `Panels` with `glassHeader` lays it over the main panel, and the thread pads its own top by the header's height.

### Elevation

A shadow means "on top".

- Small floating layers (menus, popovers, hover cards, tooltips, the scroll-to-latest button) take `shadow-md`. Panels that own space (dialogs, sheets, quick chat) take `shadow-lg`. Nothing goes deeper.
- Everything docked is flat: cards, buttons, fields, the sidebar, the header. They're set apart by their ground and a hairline.
- The composer is the one docked surface that lifts. It's flat on its hairline at rest and takes `shadow-sm` while you're typing in it, at 150 ms, because then it's the thing in front of you.
- No coloured shadows and no inset shadows.

### Radius

- A nested corner is the container's corner minus the padding between them. Matching the parent makes the inner element look like it's bulging out.
- One radius family per row: pills or corners, not both. `rounded-full` is for things that are truly circular or capsule-shaped: switches, avatars, status dots, round icon buttons.
- Nothing you can click is rounder than `rounded-xl` (about 20px), except those circles and capsules.

### Layers

From the bottom:

| layer    | z      | what                                                                                       |
| -------- | ------ | ------------------------------------------------------------------------------------------ |
| page     | none   | page content                                                                               |
| raised   | `z-10` | something that must clear its siblings: a pinned row, the remove button over an attachment |
| sticky   | `z-20` | furniture content scrolls under: the sidebar rail, a sticky toolbar                        |
| floating | `z-50` | menus, popovers, hover cards, tooltips, dialogs, sheets, quick chat                        |

- Every floating layer sits at `z-50` and portals to the end of `<body>`, so DOM order stacks them: whatever opened last is on top. A toast, when there is one, goes above a dialog, and a tooltip above everything.
- Don't write another number. If something needs to sit above something else and fits none of these, the structure is wrong: use DOM order, or `isolate` on the container.

## Spacing

- A 4px grid on Tailwind's scale, with no arbitrary values. If something needs 14px, the answer is 12 or 16. The 2px half-step is for genuine optical exceptions.
- Padding gets smaller as you nest: a card is `p-4`, the block inside it `p-3`, the chip inside that `px-2`. Equal padding at two levels makes the inner element look like it escaped.
- `gap`, not margin. Spacing belongs to the container, so a component never carries an outside margin another layout has to undo.
- One step for related things, two for separate ones. Label to field is one step; field to the next field is two.

## Lines

Add a line only when the page is harder to read without it.

- Rows are separated by spacing and a hover fill, not by dividers.
- Never a box in a box in a box. Change the structure instead.
- Don't stack a border, a ring and a shadow on one resting edge.
- Labels in the thread (the day it picks up on, a voice chat starting or ending) are plain centred caption text in `muted-foreground`, with no lines either side.

## Focus

- Keyboard focus only: `focus-visible`, never `focus`, so clicking a field doesn't paint it.
- Drawn in `--ring` at full strength, never faded (`/50`, `/60`).
- Fields you type into, and chips with a hairline, turn their border `--ring`:

  ```
  border border-input focus-visible:border-ring focus-visible:ring-0 outline-none
  ```

- Everything else you can focus (buttons, icon buttons, menu triggers, the orb, a fold's trigger) gets a 2px ring with no offset and no glow:

  ```
  outline-none focus-visible:ring-2 focus-visible:ring-ring
  ```

## Motion

Every motion has a job: it explains a state change (a menu came from its trigger), keeps continuity (the eye follows a row to its new place), or confirms an action (a press dents). Motion that does none of these is cut. Motion never holds text back from being read: a streaming reply arrives at the speed of the stream, and anything already on the page at load is simply there.

| duration | for                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------- |
| 80 ms    | what the pointer does directly: a press, a hover on a control, a row's background               |
| 150 ms   | a state the pointer toggles: a chevron turning, a switch; menus, popovers and tooltips arriving |
| 280 ms   | something arriving or reshaping the page: a panel resizing, a region folding, a dialog or sheet |
| 70 ms    | the step between items when several arrive together                                             |

- **Two curves.** Ease-out `cubic-bezier(0.16, 1, 0.3, 1)` for everything entering or answering input; ease-in `cubic-bezier(0.4, 0, 1, 1)` for everything leaving. Write them as values, `ease-[cubic-bezier(0.16,1,0.3,1)]`: Tailwind's own `ease-out` is a different curve. `linear` is only for a scroll at a steady pace, like a row title scrolling to its end. A duration or curve off this list is a bug.
- **Reduced motion, without exception.** Every transition carries `motion-reduce:transition-none` and every animation `motion-reduce:animate-none`, on the same element. Spinners, staggers and fades count. Motion driven from JavaScript (the orb, the dictation waveform, a panel snapping) checks `matchMedia("(prefers-reduced-motion: reduce)")` itself and holds still. Registry code never relies on a global rule.
- **Name the properties.** `transition-[opacity,scale]` says what moves; `transition-all` is never used. `transition-colors`, `transition-opacity` and `transition-transform` are fine. In Tailwind v4, `scale-*`, `rotate-*` and `translate-*` set their own properties, so list those rather than `transform`.
- **Press feedback.** A labelled button or clickable card dents with `active:scale-[0.97]`, an icon-only button with `active:scale-90`, so either moves about a pixel at each edge. Scale only, at 80 ms. Nothing grows on hover.
- **Turning icons.** A trigger's icon turns at 150 ms to show that what it opens is open: a chevron by 180°, a plus by 45°, a fold's chevron by 90°. It turns back when it closes.
- **Fold, don't pop.** A region that appears inside the layout (the attachment tray, the voice orb above the composer, a row of chips) stays mounted and folds: `grid-template-rows` from `0fr` to `1fr` with opacity, at 280 ms, around an `overflow-hidden` wrapper. It's `inert` while shut and keeps its last contents while it folds away. `ComposerHeader` is the reference.
- **Stagger** only a small set that arrives together, 70 ms per item at 280 ms each. Never a long list. An entrance with a delay takes `fill-mode-both`.
- **Loops** run only for streaming and loading (the caret, a skeleton's pulse, a running step's shimmer, a live dot's ping) and stop the moment the work does.
- **Skeleton or activity.** Content whose shape is known while it loads shows a `Skeleton` in that shape. The activity grammar (the pulsing live dot, a shimmering step label, a spinner) appears only while machine work is under way, and names that work. A spinner alone is for an action the person started whose result has no shape yet.
- No scroll-triggered reveals and no parallax.

### Keyframes

A closed set. Reach for one of these before writing another, and never write a second keyframe for a job one already does.

| keyframes                                 | from                | job                                                      |
| ----------------------------------------- | ------------------- | -------------------------------------------------------- |
| enter, exit (`animate-in`, `animate-out`) | tw-animate-css      | menus, popovers, dialogs and sheets arriving and leaving |
| `accordion-down`, `accordion-up`          | shadcn/tailwind.css | an accordion folding open and shut                       |
| `caret-blink`                             | globals.css         | the caret after a streaming reply                        |
| `sd-liveIn`                               | globals.css         | each new word of a reply landing in live ink             |
| `tw-shimmer` (`shimmer`)                  | shadcn/tailwind.css | the label of a step that's running                       |
| `scroll-fade-*`                           | shadcn/tailwind.css | a list's edge fading while more of it is hidden          |
| `pulse`                                   | Tailwind            | a skeleton; the orb while it connects                    |
| `ping`                                    | Tailwind            | the ring on a live `Status` dot                          |
| `spin`                                    | Tailwind            | a spinner beside an action under way                     |

Motion driven from JavaScript counts too:

| motion                                | file                                 | job                                            |
| ------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| panel snap (`element.animate`)        | `components/panels.tsx`              | a panel snapping open or shut past its minimum |
| word reveal (`requestAnimationFrame`) | `components/aiellie/stream-text.tsx` | a reply's words fading in                      |
| waveform (canvas)                     | `components/aiellie/composer.tsx`    | what the microphone hears while dictating      |
| the orb (Warp shader)                 | `components/aiellie/voice-orb.tsx`   | swelling and swirling with whoever is talking  |

A new keyframe is added to these tables with its job, in the same change, and ships with its reduced-motion escape.

## Messages

- A person's turn sits on the end in a `secondary` bubble. The assistant's turn is `ghost`: plain text, no bubble. The `primary` variant exists but is never the default.
- Timestamps are caption text in `muted-foreground`, in the sans with `tabular-nums`, not in mono.
- Before a reply's first word, the thinking indicator names the step actually under way ("Thinking", "Searching for…") with the seconds so far. Never a generic "Loading".
- While a reply streams there's one caret, a 2px bar in `live`, after the last part only, and the message carries `aria-busy`. Each new word fades in, in live ink, and settles into the text's own colour.
- A reply's reasoning is one quiet row above it: "Thinking" while it works, open so the thoughts can be watched, then "Thought for N seconds", folded shut once the reply starts unless the person opened or shut it themselves. The thoughts sit in `muted-foreground` beside a start-side hairline. `components/aiellie/reasoning.tsx` is the reference.
- A reply that searched lists its pages under the answer as small chips: the site's favicon (a link glyph when it has none) and its host, with "+N more" for the rest. Hovering a chip opens a glass hover card previewing the page, with a skeleton while it loads. `components/aiellie/sources.tsx` is the reference.
- A failed reply says why and offers to retry. "The API key was refused" tells the person what to do; "Failed" alone doesn't.
- Spoken turns join the thread as they finish, with the wave mark before their words. A voice chat's first spoken turn has "Voice chat · model name" above it, and its last has "Voice chat ended" below it once the call is over.

## Patterns

### Attachments

An image shows as a square of itself, cropped with `object-cover`, its name kept for the accessible label. Anything else is a chip: its icon on a `muted` tile, its name, and its kind and size in caption ink. Squares and chips share one height so a mixed row lines up, and the row scrolls sideways with an edge fade rather than wrapping. The remove button shows on hover, on focus, and always on touch. `components/aiellie/file-attachment.tsx` is the reference.

### Plans

A plan the model proposes is a docked card in the reply: a hairline, no fill, `rounded-xl` and `p-4`. A caption row ("Plan · 4 steps") with its state at the end, the title, the numbered steps, then the answer. Until the person answers it, every line is a field that looks like text: its border shows `input` on hover and `ring` on focus, and its words line up with the plain text it becomes, so nothing shifts when it settles. A step's details field shows while the step is being worked on, or once it has words. A step's number is its handle: it turns into a grip on hover and drags the step, or takes ↑, ↓, Home and End once focused, and rows glide to their new places at 280 ms. Each step has a remove button that shows on hover, on focus, and always on touch; a removed step stays listed, struck through, with Restore, until the plan is answered. A step that was moved, edited, added or removed says so in caption ink at its end, and the footer counts the edits beside Reset. Enter adds a step, Backspace in an empty one removes it, Alt+↑ and Alt+↓ move it, ⌘ or Ctrl+Enter approves. Approve sends the plan as left and the model carries it on; Keep planning sends it back with a note on what to change, and the model proposes another; Dismiss does neither. Once answered, focus moves to the card, and it lists what was changed. Its state is a `Status` at the end of the caption row: "Writing" in `live` while its steps fill in, "Needs approval" (or "Edited") in `pending` while it waits, then "Approved" in `success` or "Dismissed" in `muted`, read-only from then on. A dismissed or never-answered plan sits in `muted-foreground`. Approve comes first in the footer, then Dismiss, with Reset at the end once it's been edited. `components/aiellie/plan-review.tsx` is the reference.

### Memory

Memory is what the person wants kept across chats, and every use of it shows in the thread, never only in the prompt.

- A recall or a save is a trace line in the reply, like a web search: the bookmark, then what happened. While it works the title shimmers ("Recalling memories about “coffee”", "Saving to memory") and the line is `data-status="running"`, so it's the one live thing and the thinking indicator gives way to it. Once settled, there's no brand and nothing moves: "Recalled 3 memories" folds open onto them, "No memories matched" sits greyed, and "Saved to memory" has Undo beside it. An undone or since-deleted save reads "Removed from memory" with its text struck through. A call stopped before it was answered says "Stopped before recalling" rather than shimmering forever, and a failed one is the trace's error line with the reason. `components/aiellie/memory-trace.tsx` is the reference.
- The model saves only when asked and never keeps anything sensitive. Everything else the person saves themselves.
- A message saves from its toolbar: the bookmark after Copy on a reply, and the only action on the person's own message. It opens a dialog with the text to cut down to the fact worth keeping, and turns into a tick for a moment once saved, as Copy does. `MessageSaveAction` in `components/aiellie/message-actions.tsx` is the reference.
- Highlighting text in the thread floats a glass bar over it, above the highlight or below it when there's no room: Reply quotes the text into the composer, under whatever's already there, and puts the caret after it; Save opens a solid menu of places to keep it, Memory first. The menu is solid because the bar is already glass. Saving turns Save into "Saved" with a tick for a moment, then the bar goes with the highlight. Pressing the bar never clears the highlight it acts on. `components/aiellie/selection-toolbar.tsx` is the reference.
- The Memory page lists every memory like Projects lists projects: its text, who saved it and when, and a link to its chat. A row opens to edit, its "…" holds Delete, confirmed. Enter saves in its dialog.

### Editor

Rich text the person writes, stored as Markdown so it can go into a chat, a memory or a project as it is. `components/aiellie/editor.tsx` is the reference.

- It's docked: `paper` with the hairline, `rounded-xl`, and the border turns `ring` while focused. Nothing in it is live, so there's no brand, not even on the caret. A word count sits under the text, `tabular-nums`, with a hairline above it.
- The text is drawn like a reply: headings by size, never weight; lists, quotes and markers in `muted-foreground`; code in Geist Mono on a faint fill; links underlined in the muted ink.
- Selecting text floats a glass bar over it, like the highlight toolbar: Bold, Italic, Strikethrough, Code and Link, a hairline, then Heading, Subheading, Bulleted list and Quote. A button whose mark or block is on stays pressed in. Link turns the bar into a field for the address in place; an address with no scheme gets `https://`, and an empty one removes the link.
- Typing `/` at the start of a line or after a space opens a glass list of blocks under the caret, each with the characters that make it at the start of a line (`#`, `-`, `>`). What's typed after the slash filters it; arrows move, Enter or Tab picks, Escape closes it until the caret leaves that slash. Pressing it never takes focus from the text.
- Read-only is the same document with the chrome gone: no surface, no count, no bar, no menu.

### Secret fields

A key the person pastes in is a password field in an `InputGroup`, with show and clear buttons at its end. Show flips it to plain text and back (`ViewIcon`, `ViewOffSlashIcon`). Clear stays disabled while the field is empty, so the field's end doesn't shift, and puts focus back in the field. The field is `font-mono`, since a key is an id, and carries `data-1p-ignore` and `data-lpignore` so password managers don't offer to save it as a login. Where to get a key is a quiet "Get a key" link with an up-right arrow at the end of the label row, never a button. `components/api-keys-dialog.tsx` is the reference.

### Scrolling lists

- Rows that get you somewhere stay put; only the list under them scrolls. In the sidebar, the header and the main rows sit above the scroll area.
- An edge of a scrolling list fades over 24px with a mask, only while more of the list is hidden past it. A list that fits shows no fade.
- A row title that doesn't fit fades out; it never ends in an ellipsis. Hovering the row scrolls the title once to its end, after a 300 ms pause, at a pace set by its length, and it slides back at 150 ms when the pointer leaves.
- A section label can fold its list. The label is the button, with a chevron after it that turns 90° at 150 ms.
- `components/nav-chats.tsx` is the reference.

### Search inside a list

A search field at the top of a menu is a row of the panel, not a field inside it: edge to edge, with no fill, no border of its own and no rounding, and a `border-border/60` hairline under it. Its glyph sits in `muted-foreground/70`, lined up with the row icons below. A clear button sits at its end, disabled at 30% while the field is empty rather than hidden; clearing puts focus back in the field. `MenuSearch` in `components/ui/menu.tsx` is the reference. A standalone search field elsewhere is an ordinary input and keeps its border.

## Icons

- Hugeicons only, stroke-rounded (`@hugeicons/react` with `@hugeicons/core-free-icons`). One family: an icon from another pack is a bug. The brand and model logos in `components/ui/icons.tsx` are marks being quoted, not iconography, and are the one exception.
- 16px inside text and controls (14px beside caption text); 20px for a standalone icon button or a list's leading icon; 24px only in an empty state.
- Ink follows the text it sits with: `foreground` beside body copy, `muted-foreground` in secondary rows, the status ink for a status mark.
- An icon carries meaning alongside a word. Where the icon is the control, in a dense toolbar, it has a tooltip and an `aria-label`.
- Stroke stays as the package ships it, with no filled variants mixed in.
- A decorative icon is `aria-hidden`; a meaningful one has a label.

### Tool marks

Each tool has a mark: its icon on a tile of its own colour, a pale fill with the hue's ink, deeper fill and lighter ink in the dark. It's how a tool is recognised wherever it's offered: its row on the Tools page and its suggestion above the composer in a new chat. `ToolMark` in `components/tool-mark.tsx` holds every tool's icon and colour, and a new tool gets a row there. A tool's mark is identity, not status: it never stands in for `live`, `success`, `pending` or `destructive`, and nothing else gets a tinted tile.

### Reused icons

The same meaning gets the same mark. A row is added once an icon is used for one meaning in two places.

| meaning                                                                           | icon                 |
| --------------------------------------------------------------------------------- | -------------------- |
| a voice chat: starting one, and a turn said aloud                                 | `AudioWave01Icon`    |
| close or end: a dialog, a sheet, quick chat, a voice chat, removing an attachment | `Cancel01Icon`       |
| copy to the clipboard                                                             | `Copy01Icon`         |
| done: copied, a plan approved, or the choice in a menu                            | `Tick02Icon`         |
| more actions for a message or a plan's step, or a tool's details                  | `MoreHorizontalIcon` |
| search                                                                            | `Search01Icon`       |
| a web search: its trace line, and its card on the Tools page                      | `GlobalSearchIcon`   |
| opens a menu of choices                                                           | `ArrowDown01Icon`    |
| a section or step that folds open                                                 | `ArrowRight01Icon`   |

## Copy

- Every string names a control, states a fact the person needs, or says what happens next. Delete one that does none of the three.
- A control says what it does: "Start voice chat", "Copy", "Retry".
- No slogans, reassurance or sign-offs in chrome: dialogs, menus, toasts, empty states and footers. An empty slot stays empty.
- No "simply", "just", "seamlessly" or "effortlessly", and never narrate the person's feelings or freedom.
- State the thing directly; drop the "not X, but Y" setup and write Y.
- Helper text states a consequence.

## Components

- Where a component goes: the test in `AGENTS.md`.
- **Closed API.** Use the names that exist. Extend a component with a prop before adding a sibling: `ComposerSubmit` takes `onVoiceChange` rather than a new `ComposerVoiceButton`, and a status mark is the `Status` dot. Never derive a new name from another component's internals.
- **No second implementation** of something the app already ships: a second dot, a second fold, a second menu.

## Reject these

- The stock chat idiom: a sparkles welcome, a `rounded-3xl` composer, pill-shaped tool calls.
- Decorative gradients, glows, blobs and textures. The orb's colour and glow are the live state, not decoration: they show only while a call is going.
- Rainbow badges, coloured category chips, icons in tinted tiles. The one exception is a tool's mark (below).
- An icon as decoration, or standing in for a label without a tooltip.
- A card around every section, a box drawn to repair weak hierarchy, a box inside a box.
- Tiny muted text used to make density fit.
- The activity grammar for anything that isn't live machine work.

## Done

A passing build doesn't show that the design is right. Render it and look:

- the first screen, the whole page, both themes, and phone width (device emulation, not a narrowed desktop window);
- **squint**: is one thing clearly dominant, and is the reading path stable?
- **blur the words**: does the layout still show what's grouped and what comes next?
