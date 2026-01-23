# Design: Skill Factory UI Implementation

## Context
Phase 5 delivered the Consultant Agent backend with multi-turn conversation and tool-based pipeline orchestration. Phase 6 requires a frontend that mirrors the approved HTML prototype (`prototype_skill_factory.html`) while integrating seamlessly with the existing streaming API.

**Key Constraints:**
- Must use existing tech stack: Next.js 15, Vercel AI SDK, Tailwind, Shadcn/ui
- Cannot introduce new state management libraries beyond Zustand (already approved)
- Must maintain GitHub-inspired design language established in Phase 1-2
- Must support streaming responses with <500ms first token latency
- Must handle phase transitions triggered by server-side tool calls

**Stakeholders:**
- Frontend developers (implementation)
- Backend developers (API contract alignment)
- UX designers (prototype fidelity)

## Goals / Non-Goals

### Goals
1. **Implement prototype-to-React conversion** with high fidelity to approved design
2. **Support 5 distinct UI phases** (IDLE → CONSULTATION → DISCOVERY → FABRICATION → DELIVERY)
3. **Integrate with `/api/consultant` endpoint** using Vercel AI SDK's `useChat` hook
4. **Stream all interactions** (conversation, logs, progress) with smooth UX
5. **Phase transition logic** driven by server tool call events (no client-side guessing)

### Non-Goals
- Phase 7 Fabrication backend (stub only)
- Skill Store UI (deferred to Phase 8)
- Multi-conversation history (single session only)
- Mobile app version (responsive web only)

## Decisions

### Decision 1: State Management Architecture
**Choice:** Zustand store with phase-based state machine

**Rationale:**
- Zustand is lightweight (3KB) and avoids Redux boilerplate
- Phase enum (`IDLE | CONSULTATION | DISCOVERY | FABRICATION | DELIVERY`) provides clear state boundaries
- Vercel AI SDK's `useChat` hook handles message array; Zustand manages phase + UI-specific state (e.g., ACS scores, logs)

**Alternatives Considered:**
- **Context API only:** Rejected - would cause unnecessary re-renders for large message arrays
- **Redux Toolkit:** Rejected - overkill for single-page state; adds 40KB bundle size

**Store Structure:**
```typescript
interface ChatStore {
  // Phase state
  currentPhase: Phase;
  setPhase: (phase: Phase) => void;

  // Tool call state
  activeToolCall: { tool: string; args: any } | null;
  toolResults: Record<string, any>;
  
  // UI-specific state
  discoveryLogs: string[];
  fabricationLogs: string[];
  acsScores: ScoredRepository[];
  skillArtifact: SkillArtifact | null;
  
  // Actions
  addDiscoveryLog: (log: string) => void;
  addFabricationLog: (log: string) => void;
  setACSScores: (scores: ScoredRepository[]) => void;
  setSkillArtifact: (artifact: SkillArtifact) => void;
  reset: () => void;
}
```

### Decision 2: Phase Transition Mechanism
**Choice:** Server-driven phase transitions via tool call events

**Rationale:**
- Backend controls orchestration logic (e.g., when to search vs clarify)
- Frontend is a "dumb" renderer that reacts to events
- Prevents client/server state divergence

**Flow:**
1. Backend emits `{ type: "tool-call", name: "findRepository", args: {...} }`
2. Frontend `useChat` onToolCall callback detects event
3. Frontend updates Zustand store: `setPhase("DISCOVERY")`
4. UI automatically re-renders to show ScoutBlock

**Alternatives Considered:**
- **Client-side intent detection:** Rejected - would require duplicating LLM logic in frontend (fragile)
- **URL-based routing (e.g., `/chat/discovery`):** Rejected - phases are ephemeral, not bookmarkable states

### Decision 3: Component Composition Strategy
**Choice:** Container/Presenter pattern with phase-specific presenters

**Structure:**
```
app/page.tsx (Container)
├── components/chat-ui/initial-view.tsx (IDLE phase)
├── components/chat-ui/stream-view.tsx (Shared container for phases 2-5)
│   ├── conversation-block.tsx (CONSULTATION phase)
│   ├── scout-block.tsx (DISCOVERY phase)
│   ├── fabricator-block.tsx (FABRICATION phase)
│   └── skill-delivery-card.tsx (DELIVERY phase)
└── components/chat-ui/acs-score-card.tsx (Shared component)
```

**Rationale:**
- Each phase component is self-contained (easy to test in isolation)
- `stream-view.tsx` orchestrates phase rendering based on Zustand store
- Avoids prop drilling (components read from Zustand directly)

**Alternatives Considered:**
- **Single monolithic ChatView component:** Rejected - would exceed 500 lines, hard to maintain
- **Route-based phase components:** Rejected - adds unnecessary routing complexity

### Decision 4: Streaming Integration Pattern
**Choice:** Vercel AI SDK `useChat` + custom event parser

**Implementation:**
```typescript
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/consultant',
  onToolCall: async ({ toolCall }) => {
    // Phase transition based on tool
    if (toolCall.name === 'findRepository') {
      useChatStore.getState().setPhase('DISCOVERY');
    } else if (toolCall.name === 'generateSkill') {
      useChatStore.getState().setPhase('FABRICATION');
    }
  },
  onFinish: (message) => {
    // Tool result handling
    if (message.toolInvocations) {
      message.toolInvocations.forEach(inv => {
        if (inv.state === 'result') {
          useChatStore.getState().setToolResult(inv.toolName, inv.result);
        }
      });
    }
  },
  experimental_streamData: true  // Enable tool progress events
});
```

**Rationale:**
- `useChat` handles SSE parsing, reconnection, and message management
- Custom callbacks (`onToolCall`, `onFinish`) integrate with Zustand for phase control
- `experimental_streamData` enables progress event streaming for live logs

**Alternatives Considered:**
- **Custom SSE client:** Rejected - would duplicate 500+ lines of battle-tested SDK code
- **WebSockets:** Rejected - SSE is simpler and Vercel Edge Runtime friendly

### Decision 5: Log Streaming for Discovery/Fabrication
**Choice:** Append-only log arrays in Zustand, rendered with auto-scroll

**Implementation:**
```typescript
// Store
discoveryLogs: string[] = []
addDiscoveryLog: (log: string) => 
  set(state => ({ discoveryLogs: [...state.discoveryLogs, log] }))

// Component
<div ref={logContainerRef} className="terminal-logs">
  {logs.map((log, i) => (
    <div key={i} className="log-line">{log}</div>
  ))}
</div>

// Auto-scroll hook
useEffect(() => {
  logContainerRef.current?.scrollTo({
    top: logContainerRef.current.scrollHeight,
    behavior: 'smooth'
  });
}, [logs]);
```

**Rationale:**
- Simple array append is performant (max 100 lines per phase)
- Avoids complex virtualization for short log lists
- Auto-scroll uses native browser behavior (smooth, no jank)

**Alternatives Considered:**
- **react-virtualized for logs:** Rejected - overkill for <100 lines
- **Log rotation (keep only last 20):** Rejected - users want to see full history in session

## Risks / Trade-offs

### Risk 1: Phase Transition Timing Issues
**Description:** If backend tool call event arrives before frontend is ready, phase transition may be missed.

**Mitigation:**
- Vercel AI SDK buffers events; frontend receives all tool calls even if mounted late
- Add `useEffect` to check for pending tool calls on mount
- Log phase transitions for debugging

**Fallback:** If phase desync occurs, user can refresh page (conversation persisted in Vercel AI SDK state)

### Risk 2: Streaming Latency on Slow Networks
**Description:** Users on 3G networks may experience laggy typewriter effect.

**Mitigation:**
- Backend sends text deltas in 20-50 char chunks (not per-token)
- Reduce chunk frequency if RTT >500ms (adaptive chunking)
- Show "Loading..." indicator if first token >1s

**Trade-off:** Larger chunks reduce perceived smoothness but improve reliability

### Risk 3: Component Re-render Performance
**Description:** Zustand updates may trigger excessive re-renders if not optimized.

**Mitigation:**
- Use Zustand selectors to subscribe only to needed state slices:
  ```typescript
  const phase = useChatStore(state => state.currentPhase);  // Not entire store
  ```
- Wrap expensive components in `React.memo`
- Profile with React DevTools before launch

**Target:** <50ms render time for phase transitions on mid-range devices

## Migration Plan

### Phase 1: Foundation (Day 1)
1. Create Zustand store with types
2. Update `app/layout.tsx` header
3. Add base types in `lib/types/chat.ts`
4. Test store with mock data

### Phase 2: Core Components (Days 2-3)
1. Implement `initial-view.tsx` (IDLE phase)
2. Implement `conversation-block.tsx` (CONSULTATION phase)
3. Implement `scout-block.tsx` (DISCOVERY phase)
4. Implement `fabricator-block.tsx` (FABRICATION phase)
5. Implement `skill-delivery-card.tsx` (DELIVERY phase)
6. Test each component in isolation with Storybook (optional)

### Phase 3: Integration (Day 4)
1. Replace `app/page.tsx` with new implementation
2. Integrate `useChat` hook
3. Wire up phase transitions in `onToolCall` callback
4. Test with `/api/consultant` endpoint (mocked tool responses)

### Phase 4: Polish & Testing (Days 5-6)
1. Add animations (fade-in, scroll)
2. Test all phase transitions with real backend
3. Test error states (network failure, timeout)
4. Test mobile responsive layout
5. Performance profiling and optimization

### Rollback Strategy
- Keep old `app/page.tsx` as `app/legacy-analyze/page.tsx`
- If critical bug found, revert deployment and restore old page
- Feature flag (env var) to toggle between old/new UI

## Open Questions

1. **Q: Should we persist conversation history across page refreshes?**
   - **A:** Deferred to Phase 8. Current scope: single session only (state lost on refresh).

2. **Q: How to handle multiple concurrent tool calls (e.g., parallel discovery + fabrication)?**
   - **A:** Not supported in Phase 6. Backend orchestrator ensures sequential execution.

3. **Q: Should Direct Fabrication (URL shortcut) bypass Consultant Agent entirely?**
   - **A:** No. Still call `/api/consultant` with URL in message. Agent decides to skip discovery.

4. **Q: What happens if user clicks "Convert to Skill" before Phase 7 is implemented?**
   - **A:** Show stub message: "Fabrication pipeline coming soon (Phase 7)". Log event for analytics.
