# Memory doc plan

A document called **Memory**, pinned in Stashd, where every memory shows as a bullet you can edit in the rich text editor (`components/aiellie/editor.tsx`).

## Open questions

- **A. What does the doc hold?** Recommended: memories stay in `components/memory-store.ts`, and the doc is an editable view of them where each bullet is one memory. With this setup the tools, Undo in the thread, and "saved by / from which chat" all keep working as they do now. The other option makes the doc the only source, with free headings and notes that the tools search as plain text. That loses per-memory Undo and who saved what.
- **B. Does "template" mean starter sections**, like About me / Preferences / Work? Recommended: not yet. For now it's a fixed title, one line saying what the doc is, then the bullets. Sections would need their own field in the store.

## Steps

The plan assumes the recommended answers. Work goes on branch `claude/project-thread-04s0vs`, off `main`, which already has the memory and editor work.

1. **Doc logic.** `lib/memory-document.ts` turns memories into a bulleted Markdown list, and works out what an edited list adds, changes or removes. It matches bullets by their exact text first, then by order.
   *Check:* a scratch run round-trips a list and gets the right changes after an edit.
2. **Store.** `applyMemoryChanges` in `components/memory-store.ts` saves all of those changes in one write, so other tabs get a single update.
   *Check:* after one call, the edits show in another tab.
3. **Memory doc page.** `/stashd/memory` shows the editor, filled from the store. It saves a moment after you stop typing and picks up saves from chats as they happen, though never while you're typing.
   *Check:* type a bullet, reload, and it's still there.
4. **Pinned in Stashd.** A fixed first row in `app/stashd/page.tsx` opens the doc, shows the memory count and turns up in search. It isn't stored in IndexedDB, so it can't be renamed or deleted.
   *Check:* it sits at the top and searching "memory" finds it.
5. **Retire the old Memory page.** The sidebar's Memory row opens the doc, and `/memory` sends you there too. `components/memory-dialog.tsx` stays only if the save dialogs still use it.
   *Check:* the sidebar row lands on the doc.
6. **Tools.** No change to `lib/tools/memory.ts`. `recall_memory` and `save_memory` still go through the store, so a save from a chat shows up as a new bullet and Undo removes it.
   *Check:* tell a chat "remember I take coffee black", see the bullet appear, undo it and see it go.
7. **design.md and final checks.** Rewrite the Memory section under Patterns, then run `pnpm typecheck` and `pnpm lint`, and look at both themes and phone width.
