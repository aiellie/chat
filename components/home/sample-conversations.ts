// Placeholder conversations until there's a backend to load them from.

export type Message = { id: string; author: string; text: string }

export type Conversation = { id: string; title: string; messages: Message[] }

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "design",
    title: "Design review",
    messages: [
      { id: "1", author: "Sam", text: "Pushed the new sidebar mocks." },
      {
        id: "2",
        author: "Priya",
        text: "Looks great. Can we tighten the spacing?",
      },
    ],
  },
  {
    id: "launch",
    title: "Launch planning",
    messages: [
      { id: "1", author: "Alex", text: "Are we still on for Thursday?" },
    ],
  },
  {
    id: "random",
    title: "Random",
    messages: [{ id: "1", author: "Jordan", text: "Anyone up for lunch?" }],
  },
]
