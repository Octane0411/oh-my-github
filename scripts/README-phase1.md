# Phase 1 Testing Guide

## Overview

Phase 1 implements the **Query Translator Agent**, which converts natural language queries into structured search parameters with semantic keyword expansion.

## What's Been Implemented

### ✅ Task 1.1: Setup LangGraph.js and Dependencies
- Added LangGraph, OpenAI SDK, and supporting libraries to `package.json`
- Created type definitions in `lib/agents/h1-search-pipeline/types.ts`
- Set up workflow skeleton in `lib/agents/h1-search-pipeline/workflow.ts`

### ✅ Task 1.2: Implement Query Translator Agent
- Created `lib/agents/h1-search-pipeline/query-translator/index.ts`
- Implemented LLM-powered translation with 5 few-shot examples
- Added semantic keyword expansion based on `searchMode`:
  - **Focused**: No expansion (exact match)
  - **Balanced**: 2-3 synonym expansions (default)
  - **Exploratory**: 5-8 semantic term expansions
- Implemented star range inference (independent of searchMode):
  - "popular"/"widely used"/"mainstream" → min: 1000 stars
  - "new"/"recent"/"emerging"/"fresh" → min: 10, max: 1000 stars
  - "mature"/"stable"/"established"/"production-ready" → min: 5000 stars
  - Default → min: 50 stars
  - ⚠️ **Note**: Feature keywords (e.g., "lightweight", "small", "fast") do NOT affect star range
- Added timeout handling (5s) with rule-based fallback

### ✅ Task 1.3: Wire Query Translator into LangGraph Workflow
- Connected Query Translator node to LangGraph StateGraph
- Set up entry and finish points
- Ready for Scout agent integration in Phase 2

## Setup Instructions

### 1. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Then add your API keys:

```env
# Required: GitHub API Token
GITHUB_TOKEN=your_github_token_here

# Required: DeepSeek API Key (recommended) OR OpenAI API Key
DEEPSEEK_API_KEY=your_deepseek_api_key_here
# OR
# OPENAI_API_KEY=your_openai_api_key_here
```

**Getting API Keys:**
- **GitHub Token**: https://github.com/settings/tokens (select `public_repo` scope)
- **DeepSeek API**: https://platform.deepseek.com (cost-effective, ~$0.0001 per query)
- **OpenAI API**: https://platform.openai.com/api-keys (fallback option)

### 2. Run the Test

```bash
bun run scripts/test-phase1.ts
```

## Expected Test Output

The test script runs 5 diverse queries and validates:

1. **Keyword extraction** - Primary keywords correctly identified
2. **Semantic expansion** - Expansion behavior matches searchMode
3. **Star range inference** - Star ranges match user intent keywords
4. **Execution time** - Query translation completes in < 2 seconds

### Sample Output

```
🧪 Phase 1 Testing: Query Translator + LangGraph Workflow

======================================================================

📝 Test 1: Popular library (balanced mode)
Query: "popular React animation library"
Mode: balanced
✅ Completed in 1247ms

Extracted Parameters:
  Keywords: React, animation, library
  Expanded Keywords: motion, transition
  Language: TypeScript
  Star Range: min=1000, max=∞
  Topics: react, animation

Execution Time:
  Query Translator: 1245ms

Validation:
  ✓ Keywords extracted correctly
  ✓ Expansion present as expected (balanced mode)
  ✓ Min stars correct: 1000

✅ Test 1: Popular library (balanced mode) PASSED
──────────────────────────────────────────────────────────────────────

[... 4 more tests ...]

======================================================================

📊 Test Summary:
   Passed: 5/5
   Failed: 0/5

🎉 All tests passed! Phase 1 is complete.
```

## Key Features to Verify

### 1. Search Mode Behavior

- **Focused mode** should produce 0 expanded keywords
- **Balanced mode** should produce 2-3 expanded keywords
- **Exploratory mode** should produce 5-8 expanded keywords

### 2. Star Range Independence

- Star ranges are inferred from user intent words ("popular", "new", etc.)
- Star ranges do NOT change based on searchMode
- Example: "popular React library" in focused mode → still gets min: 1000 stars

### 3. Fallback Behavior

If the LLM fails or times out (5s), the system should:
- Fall back to rule-based keyword extraction
- Still return valid SearchParams
- Log a warning but not crash

## Troubleshooting

### "Missing LLM API key" Error

**Solution**: Make sure you've set either `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` in your `.env` file.

### LLM Timeout

If you see "LLM request timed out after 5000ms":
- Check your internet connection
- Try using OpenAI API instead of DeepSeek
- The system should fall back to rule-based translation automatically

### TypeScript Errors

Run type checking:
```bash
bun run type-check
```

If errors persist, ensure dependencies are installed:
```bash
bun install
```

## Next Steps

Once Phase 1 tests pass:

1. **Phase 2**: Implement Scout Agent (multi-strategy GitHub search)
2. **Phase 3**: Implement Screener Agent (rule-based coarse filtering)
3. **Phase 4-5**: Implement multi-dimensional scoring system
4. **Phase 6**: Wire up API endpoints

---

**Last Updated**: 2026-01-16
**Status**: ✅ Ready for Testing
