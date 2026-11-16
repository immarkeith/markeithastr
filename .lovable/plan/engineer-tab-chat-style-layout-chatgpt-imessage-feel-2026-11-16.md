# Engineer Tab — Chat-Style Layout (ChatGPT/iMessage feel)

Redesign **only the `/engineer` tab** so working with the AI Engineer feels like a text conversation. No backend, database, or safety-rule changes — this is presentation only. Everything that works today (voice input, approve/revise/reject, migration approval, budget resume, polling) keeps working.

## What you'll see when it's done

- The Engineer tab opens to a **conversation list** (like iMessage's main screen): one row per task, newest first, with a status pill and a preview line. Tasks waiting on you ("ready for review", "scope review", "budget paused") get a subtle highlight so they read as unread messages.
- Tapping a task opens its **thread**: your instruction appears as an outgoing bubble (right side, accent color), and everything the Engineer does comes back as incoming bubbles (left side) — its classification and plan, progress updates, the finished diff, and its "ready for review" message.
- **Action buttons hang under the Engineer's latest bubble** like quick replies: Approve, Request revision, Reject, Approve migration, Resume budget. No more hunting through panels.
- The **composer is a pinned bar at the bottom** of the screen, iMessage-style: rounded input, mic button for voice, send button. It stays put while you scroll.
- The top of the tab shrinks to a **slim header**: "ASTR Engineer" with a live status dot (active / idle / stalled) and queue count. The detailed health panel and provider settings move behind a gear icon that opens a sheet, so they stop crowding the conversation.
- Logs and diffs stay available but collapse into **tappable bubble cards** ("View build log", "View diff — 1 file changed") that expand in place.

## How it maps to the existing code

- `src/routes/engineer.index.tsx` — restructured from stacked panels into: slim header → conversation list ↔ thread view (mobile: list swaps to thread with a back button; wider screens can show both side by side).
- New `src/components/engineer/ChatBubble.tsx` — bubble shell (incoming/outgoing variants, timestamps, day dividers) using existing semantic tokens only.
- New `src/components/engineer/ConversationList.tsx` — the iMessage-style task list, built from the existing `engineerOverview` query.
- New `src/components/engineer/TaskThread.tsx` — turns a task's data (prompt, plan, status history, logs, diff) into an ordered bubble sequence.
- `TaskComposer.tsx` — restyled into the pinned bottom bar; voice logic untouched.
- `TaskDetail.tsx` — its content (diff, logs, migration card, action buttons) gets broken into bubble pieces reused by `TaskThread`; the old panel layout goes away.
- `HealthPanel.tsx` / `ProviderSettings.tsx` — moved into a settings sheet opened from the header gear.
- Auto-scroll to the newest bubble when updates arrive (polling already runs every 3s during active tasks).

## What deliberately does NOT change

- No changes to the runner, firewall, approvals, RPCs, or any GitHub workflow.
- No new backend tables or functions — bubbles are rendered from data the page already fetches.
- Recovery page (`/engineer/recovery`) stays as-is.
- Dark ASTR branding and semantic design tokens throughout; no hardcoded colors.

## Verification

- Existing test suite (`bun test`) stays green.
- Browser check on mobile viewport (390px): list → thread → approve flow, composer pinned, voice button present, bubbles aligned correctly, settings sheet opens.
