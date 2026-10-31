# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Chat

The chat in the main panel streams from Claude through the AI SDK
(`app/api/chat/route.ts`). Put your Anthropic API key in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```
