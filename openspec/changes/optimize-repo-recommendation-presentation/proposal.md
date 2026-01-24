# Change: Optimize Repository Recommendation Presentation

## Why
Current implementation returns 5 repositories ranked by ACS score, but presents them as an undifferentiated list. Users face **decision paralysis** when choosing between similarly-scored repos without understanding the specific trade-offs. From a UX perspective, users should:
1. See **one clear best recommendation** for their specific need (minimal cognitive load)
2. Understand **why each alternative differs** (not just "also good")
3. Choose based on **their priority** (speed, ease, low cost, etc.)

This change optimizes the recommendation flow to transform generic scoring into **personalized guidance** that mirrors a human consultant's reasoning.

## What Changes
- **LLM-enhanced recommendation logic**: Consultant agent analyzes ACS dimensions (Interface Clarity, Documentation, Environment, Token Economy) in context of user's specific query to generate tailored explanations for top choice + alternatives
- **Contextualized differentiators**: Each alternative includes a specific reason when to choose it (e.g., "if you need fastest setup", "if you prefer simplicity")
- **Frontend presentation**: Redesign results card to highlight top recommendation as primary choice with secondary alternatives clearly marked as "if you need different trade-offs"
- **Recommendation reasoning**: Add structured data from LLM analysis to explain which ACS dimension makes each repo ideal for different scenarios

## Impact
- **Affected specs**: 
  - `consultant-agent` (NEW: Add recommendation reasoning requirement)
  - `frontend-ui` (MODIFIED: Update repository results presentation)
- **Affected code**:
  - `lib/agents/consultant/prompts.ts` (enhance system prompt with ACS dimension analysis instruction)
  - `lib/agents/consultant/tool-executor.ts` (add recommendation reasoning output)
  - `components/chat-ui/scout-block.tsx` (redesign results display)
  - `lib/types/chat.ts` (extend ScoredRepository with reasoning fields)
- **No new dependencies** - uses existing LLM capabilities
- **User-facing change**: Results presentation becomes more guidance-oriented, reducing decision time

## Open Questions
- Should we implement user preference profiles (e.g., "cost-sensitive", "speed-sensitive") to further personalize recommendations?
- Should we add A/B testing instrumentation to measure if this reduces decision time?
