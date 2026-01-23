# Implementation Tasks

## 1. Foundation
- [x] 1.1 Create Zustand store (`lib/stores/chat-store.ts`) with phase state (IDLE/CONSULTATION/DISCOVERY/FABRICATION/DELIVERY), messages array, and streaming controls
- [x] 1.2 Update `app/layout.tsx` header to show "Skill Factory" branding matching prototype
- [x] 1.3 Create base types (`lib/types/chat.ts`) for Message, Phase, ACSScore, RepositoryCard

## 2. Core Components
- [x] 2.1 Create `components/chat-ui/initial-view.tsx` - Hero section with large input box and trending skills cards
- [x] 2.2 Create `components/chat-ui/conversation-block.tsx` - User/Agent message bubbles with markdown support and suggestion chips
- [x] 2.3 Create `components/chat-ui/scout-block.tsx` - Discovery phase with live logs and reasoning display
- [x] 2.4 Create `components/chat-ui/acs-score-card.tsx` - Repository card with ACS breakdown (Interface, Docs) and "Convert to Skill" button
- [x] 2.5 Create `components/chat-ui/fabricator-block.tsx` - Terminal-style logs with step progress (e.g., "Step 1/4: Analyzing README")
- [x] 2.6 Create `components/chat-ui/skill-delivery-card.tsx` - Success card with download button and instruction preview

## 3. Main Page Implementation
- [x] 3.1 Replace `app/page.tsx` with stream-based layout supporting phase transitions
- [x] 3.2 Integrate `useChat` from Vercel AI SDK to connect to `/api/consultant` endpoint
- [x] 3.3 Implement IDLE phase: Show `InitialView` with trending skills and large search input
- [x] 3.4 Implement CONSULTATION phase: Render conversation blocks for multi-turn dialogue
- [x] 3.5 Implement DISCOVERY phase: Show `ScoutBlock` when agent searches GitHub
- [x] 3.6 Implement FABRICATION phase: Display `FabricatorBlock` during skill generation
- [x] 3.7 Implement DELIVERY phase: Show `SkillDeliveryCard` with download and follow-up suggestions

## 4. Phase Transitions & Intent Classification
- [x] 4.1 Parse agent tool calls from streaming response to trigger phase changes (e.g., `searchGitHub` → DISCOVERY, `fabricateSkill` → FABRICATION)
- [ ] 4.2 Handle "Direct Fabrication" shortcut: Detect URL in user input and skip to FABRICATION
- [x] 4.3 Implement auto-scroll behavior to keep latest message visible during streaming

## 5. Visual Polish
- [x] 5.1 Apply GitHub-inspired design system: colors, fonts, hover states matching prototype
- [x] 5.2 Add fade-in animations for message blocks (`@keyframes fadeIn`)
- [x] 5.3 Style terminal logs with monospace font, color-coded statuses (active=blue, success=green)
- [x] 5.4 Implement ACS score gradient badge and mini breakdown grid

## 6. Testing & Validation
- [ ] 6.1 Test CONSULTATION flow: User says "I need PDF tools" → Agent asks clarifying question → User responds → Discovery triggered
- [ ] 6.2 Test Direct Fabrication: User inputs "Convert https://github.com/yt-dlp/yt-dlp to skill" → Skips to FABRICATION
- [ ] 6.3 Test error handling: Network failures, malformed responses, empty results
- [ ] 6.4 Verify responsive layout on mobile (stream view, cards stack properly)
- [ ] 6.5 Confirm streaming latency is acceptable (<500ms first token) with `/api/consultant` endpoint

## 7. Documentation
- [ ] 7.1 Update README with Phase 6 completion status and UI screenshots
- [ ] 7.2 Add JSDoc comments to all new components explaining props and usage
- [ ] 7.3 Document state management patterns in `lib/stores/README.md` (if not exists, create)
