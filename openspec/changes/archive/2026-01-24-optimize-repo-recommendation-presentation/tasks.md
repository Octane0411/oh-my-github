# Tasks: Optimize Repository Recommendation Presentation

## 1. Backend Enhancement - Consultant Agent

### 1.1 Enhance System Prompt
- [x] Update `lib/agents/consultant/prompts.ts` to instruct LLM on ACS dimension analysis
- **What**: Add guidance to CONSULTANT_SYSTEM_PROMPT explaining how to interpret ACS scores when presenting results
- **Example**: "When presenting the top recommendation, explain which ACS dimension (Interface Clarity, Documentation, Environment, Token Economy) makes it the best fit for the user's specific query"
- **Validation**: Review updated prompt; verify it covers: top choice reasoning + alternative differentiation + no ambiguity rules

### 1.2 Extend Tool Executor Output
- [x] Modify `lib/agents/consultant/tool-executor.ts` to structure recommendations with reasoning
- **What**: Update `findRepository` tool result format to include:
  - `topRecommendation`: Primary repo with `reasoning: string`
  - `alternativeReasons`: Map of repo name → conditional reason (e.g., "choose if you need better docs")
  - `summary`: Updated to emphasize top choice + clear trade-offs
- **Structure**: 
  ```typescript
  {
    topRecommendation: {
      repo: ScoredRepository,
      reasoning: string  // Why this is best for this user's query
    },
    alternatives: Array<{
      repo: ScoredRepository,
      reason: string  // "Choose if you need [condition]"
    }>,
    summary: string
  }
  ```
- **Validation**: Test with sample queries; verify reasoning references user's stated need + ACS dimension

### 1.3 Update Type Definitions
- [x] Extend `lib/types/chat.ts` to include recommendation reasoning
- **What**: Add optional fields to `ScoredRepository`:
  - `topRecommendationReason?: string` (why this is #1)
  - `alternativeReason?: string` (when to choose this)
- **Validation**: Compile TypeScript; verify no type errors

## 2. Frontend Enhancement - Results Display

### 2.1 Redesign Scout Block Component
- [x] Update `components/chat-ui/scout-block.tsx` to show highlighted top recommendation
- **What**: 
  - Display top repo in larger/prominent card with "🎯 Best Match" badge
  - Show reason for top choice (2-3 lines of reasoning text)
  - Collapse alternatives under "If you need different trade-offs:" section
  - Add optional ACS breakdown visualization (bar chart or radar)
- **Styling**: Use existing Tailwind/Shadcn component library; maintain consistency with design system
- **Validation**: Visual check on multiple screen sizes; verify top choice stands out

### 2.2 Add ACS Dimension Display
- [x] Create or update ACS score card to show which dimension is strongest
- **What**: Show ACS breakdown in scout results:
  - Bar chart or bullet list of 4 dimensions with scores
  - Highlight which dimension is strongest
  - Use color/emphasis to show why this repo is recommended
- **Existing component**: May leverage `components/chat-ui/acs-score-card.tsx` or enhance it
- **Validation**: Verify visual clarity; dimensions are understandable to non-technical users

### 2.3 Implement Alternative Comparison Helper
- [x] Add hover/click interaction to show "key difference" vs top recommendation
- **What**: When user hovers over or clicks an alternative:
  - Highlight what makes this different (ACS strength, use case, complexity)
  - Format: "This repo is stronger at [Interface Clarity / Documentation / etc.] but needs [more setup / less doc / etc.]"
  - Show as tooltip or inline card
- **Library**: Use Shadcn tooltip or popover component
- **Validation**: Test hover states; verify comparison text is helpful

## 3. Integration & Testing

### 3.1 End-to-End Test
- [x] Test full flow: user query → LLM reasoning → frontend display
- **What**: 
  - Run test query (e.g., "I want to download videos from YouTube")
  - Verify top recommendation is displayed prominently
  - Verify alternatives include conditional reasons (not just scores)
  - Verify ACS breakdown is visible and intuitive
- **Test queries** (use at least 2):
  - Query with clear winner (>15 point gap)
  - Query with close contenders (5-10 point differences)
- **Validation**: Screenshots of results; reasoning text makes sense in context

### 3.2 Verify No Regressions
- [x] Ensure existing consultation flow still works
- **What**: 
  - Multi-turn conversations should still work
  - Fabrication shortcuts (direct URL) still work
  - Streaming/progress events still emit correctly
- **Validation**: Existing tests pass; manual smoke test of full conversation

### 3.3 Update Tests (if applicable)
- [x] Add unit tests for recommendation reasoning logic
- **What**: Test that LLM generates reasoning text; verify format matches expectations
- **File**: `lib/agents/consultant/__tests__/recommendation-reasoning.test.ts` (if creating)
- **Cases**: 
  - Top choice with clear ACS advantage
  - Alternatives with different dimensions
  - Edge case: single winner (no alternatives)
- **Validation**: All tests pass

## 4. Documentation

### 4.1 Update Consultant Agent Spec
- [x] Confirm spec changes are reflected in `openspec/specs/consultant-agent/spec.md` (after archiving this change)
- **What**: Document new recommendation reasoning behavior in permanent spec
- **Validation**: Spec review; ensure future developers understand the feature

### 4.2 Add Usage Example
- [x] Add example to prompt documentation or README showing sample reasoning output
- **What**: Show before/after of recommendation presentation to demonstrate improvement
- **Validation**: Example is clear and helpful

## Execution Order
1. **Sequential**: Start with 1.1 (system prompt) → 1.2 (tool executor) → 1.3 (types) because frontend depends on these
2. **Parallel**: 2.1, 2.2, 2.3 can happen in parallel once types are updated
3. **Sequential again**: 3.1 → 3.2 → 3.3 (testing must happen after implementation)
4. **Last**: 4.1 → 4.2 (documentation after everything works)

## Estimated Effort
- Backend: 2-3 hours (prompt tuning + output formatting)
- Frontend: 2-4 hours (component redesign + interaction)
- Testing: 1-2 hours
- Documentation: 30 min
- **Total: 6-10 hours**

## Success Criteria
- ✅ User sees one clear "best recommendation" at top
- ✅ Each alternative has a specific reason to choose it (not just "also good")
- ✅ ACS dimensions visible and intuitive
- ✅ No regressions in existing flows
- ✅ All tests pass
