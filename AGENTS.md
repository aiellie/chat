<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design

Read `design.md` before changing anything people see. It holds the rules for colour, focus, motion, surfaces and copy.

# Where components go

- `components/ui/`: generic building blocks, shadcn's and our own (`tooltip-icon-button`, `editable-title`, `icons`). They know nothing about chat.
- `components/aiellie/`: chat parts, published as the `@aiellie` shadcn registry (see `components.json`).
- `components/`: the app itself. The shell, sidebar, nav, search, sharing, the stores, and `chat.tsx`, which wires the AI SDK, the API routes and stored state into the aiellie parts.

## The test for `components/aiellie/`

Could another chat app install it with `npx shadcn add @aiellie/<name>` and drive it entirely through props and callbacks? If yes, it goes in `aiellie/`. If it depends on this app (its API routes, the data it stores such as threads or API keys, its own model list, or its page layout), it goes in `components/`, or in `lib/` if it isn't UI.

What follows from that:

- An aiellie file imports only from `components/ui/`, `components/aiellie/`, `hooks/`, and `lib/` utilities and types. It never imports the app's own `components/*.tsx`, never calls `fetch("/api/…")`, and never reads the app's data or behaviour from `lib/` (`apiKeyHeaders`, the voice model list). Imports go one way: the app uses aiellie, never the reverse.
- A part may remember its own preferences, like the composer's microphone or the emoji picker's recents. Data the app owns isn't its to keep.
- When something is both, split it: the reusable view goes in `aiellie/` and takes what it needs as props, and the wiring stays in the app. For example, `components/voice-chat.tsx` (the realtime session, the `/api/realtime` call, the voice models) renders `components/aiellie/voice-orb.tsx` (the orb).
