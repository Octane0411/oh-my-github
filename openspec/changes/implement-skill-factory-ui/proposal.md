# Change: Implement Skill Factory UI (Phase 6)

## Why
Phase 5 completed the backend Consultant Agent and Discovery pipeline. Phase 6 requires a React/Next.js implementation of the approved prototype (`prototype_skill_factory.html`) to provide users with a conversational interface for building Agent Skills from GitHub repositories. The current `app/page.tsx` only supports single-repository analysis and lacks:
- Multi-turn consultation flow for clarifying user intent
- Direct fabrication shortcuts (URL-to-skill conversion)
- Streaming chat with Perplexity-style UX
- ACS score visualization
- Skill generation progress logs (terminal-style feedback)

## What Changes
- **New UI components**: `ConversationBlock`, `ScoutBlock`, `FabricatorBlock`, `ACSScoreCard`, and `SkillDeliveryCard` based on the approved prototype design
- **New page**: Replace/update `app/page.tsx` with Skill Factory interface supporting IDLE → CONSULTATION → DISCOVERY → FABRICATION → DELIVERY phases
- **State management**: Add Zustand store for managing conversation state, phase transitions, and streaming message updates
- **Streaming integration**: Connect UI to `/api/consultant` endpoint using Vercel AI SDK's `useChat` hook
- **Visual enhancements**: GitHub-inspired design system with terminal-style logs, ACS score display, and phase-specific UI states

## Impact
- **Affected specs**: 
  - `frontend-ui` (major changes - new page structure, components, state management)
  - `streaming-protocol` (minor - UI consumption of existing streaming format)
  - `consultant-agent` (documentation - clarify UI-facing tool call formats)
- **Affected code**: 
  - `app/page.tsx` (complete rewrite based on prototype)
  - `components/chat-ui/` (new directory with 5+ components)
  - `lib/stores/chat-store.ts` (new Zustand store)
  - `app/layout.tsx` (update header for Skill Factory branding)
- **Dependencies**: No new dependencies; leverages existing Vercel AI SDK, Tailwind, Shadcn/ui
- **Migration**: Old analysis UI becomes deprecated; future: move to `/legacy/analyze` if needed
