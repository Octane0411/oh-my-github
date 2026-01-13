# Change: Add LLM Analysis Pipeline

## Why
To validate the technical feasibility of AI-powered repository analysis, we need to confirm that LLMs can effectively analyze GitHub repository metadata and generate structured, actionable reports. This is a P0 risk mitigation task that validates the core value proposition of oh-my-github before building the full multi-agent system.

## What Changes
- Add LLM provider integration (DeepSeek V3 primary)
- Implement prompt templates for repository analysis
- Create structured Markdown report generation
- Add token usage tracking and cost estimation
- Create test scripts to validate LLM analysis quality

## Impact
- **Affected specs**:
  - `llm-integration` (new capability)
  - `report-generation` (new capability)
- **Affected code**:
  - New directory: `lib/llm/` with client and prompt management
  - New directory: `lib/reports/` with report generation logic
  - New test script: `scripts/test-llm.ts`
- **Dependencies**:
  - Requires DeepSeek V3 API key (already configured in `.env`)
  - Depends on: Proposal 1 (`add-github-data-layer`) for repository metadata
- **Risks**:
  - LLM output quality variability - mitigated by prompt engineering and testing
  - Token costs for analysis - mitigated by using cost-effective DeepSeek V3
  - Context window limits - mitigated by structured metadata input (not full code)