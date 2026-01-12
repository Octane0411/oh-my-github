# Project Context

## Purpose
**oh-my-github** is "The VC Analyst for Open Source Code" - an AI-powered system that helps developers discover high-quality open source projects worth contributing to. It goes beyond simple star counts by analyzing project activity, contribution friendliness, code quality, and onboarding ease to recommend projects where contributions are likely to be accepted.

**Key Goals**:
- Find "Alpha" projects: Early-stage projects (100-5k stars) with strong growth momentum
- Analyze contribution-friendliness: PR merge rates, issue response times, maintainer engagement
- Deep code audits: Architecture analysis, test coverage, onboarding difficulty
- Save time: Transform "mass browsing" into "precise matching"

## Tech Stack
### Frontend
- Next.js 15 (App Router)
- Bun (runtime)
- Vercel AI SDK (streaming UI)
- TailwindCSS + Shadcn/ui
- Recharts (radar charts, sparklines)

### Backend
- Next.js API Routes with Edge Runtime (TypeScript)
- LangGraph.js (multi-agent orchestration)
- Claude 3.5 Sonnet / GPT-4o (code analysis)
- gpt-4o-mini (intent understanding)
- Octokit SDK (GitHub API)

### Infrastructure
- Vercel (deployment, Edge Network)
- Vercel KV / Upstash Redis (caching)
- Supabase/PostgreSQL (Phase 2 - persistent storage)

## Project Conventions

### Code Style
- TypeScript throughout (full-stack)
- Functional/compositional approach for LangGraph nodes
- Edge Runtime compatible code (no Node.js-specific APIs in API routes)
- GitHub-inspired dark mode design system
- Primer CSS aesthetic with cyberpunk touches
- Font: System UI stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`)

### Architecture Patterns
- **Multi-Agent State Machine**: LangGraph orchestrates a funnel workflow with 4 specialized agents:
  1. **Query Translator**: Converts natural language to GitHub search parameters
  2. **The Scout**: Sources 50-100 candidate repos via GitHub API
  3. **The Screener**: Applies weighted scoring (Activity 40%, Accessibility 30%, Size 30%) to select top 10
  4. **The Auditor**: Deep dive analysis on final 3-5 projects
- **Global State Pattern**: Single `AgentState` flows through all nodes
- **Divide and Conquer**: Each agent focuses on one specific task
- **Streaming First**: Use Vercel AI SDK for real-time progress updates
- **Transparent Progress**: Show agent thinking steps to users

### Testing Strategy
- TBD - Project is in design phase
- Future: Test LangGraph nodes in isolation
- Future: Mock GitHub API calls for deterministic testing

### Git Workflow
- TBD - Project is in initial setup phase
- Expected: Standard GitHub Flow with feature branches

## Domain Context
### Open Source Contribution Discovery
- **Target Users**: Open source contribution beginners ("小白")
- **Problem**: Hard to find projects that are:
  - Active and well-maintained
  - Contributor-friendly (welcoming maintainers, good documentation)
  - At the right stage (not too big/competitive, not abandoned)
  - Aligned with user interests and skills

### VC-Style Analysis Metaphors
- **"Alpha"**: High-potential projects (like early-stage startups)
- **"Sourcing"**: Initial broad search phase
- **"Screening"**: Quantitative filtering
- **"Due Diligence"**: Deep dive analysis
- **"Investment Report"**: Final recommendation with action items

### Key Metrics
- **Activity**: Recent commits, issue response time (<48h ideal)
- **Contribution Opportunity**: Open issues, PR merge rate, "good first issue" count
- **Onboarding Quality**: Documentation completeness, CONTRIBUTING.md presence
- **Code Quality**: Test coverage, CI/CD setup, architecture clarity

## Important Constraints
### Technical
- **Vercel Serverless Timeout**: 10s limit on Hobby plan, mitigated by:
  - Edge Runtime (bypasses limit with streaming)
  - Streaming responses to keep connection alive
- **LLM Context Window**: Can't feed entire codebases
  - Strategy: Use RAG/smart context (file tree + key files only)
- **GitHub API Rate Limits**: 5,000 requests/hour (authenticated)
  - Strategy: Implement Redis caching for repeated queries

### Cost
- **MVP Target**: $0 (Vercel Hobby Plan + free-tier LLM credits)
- **Scalability**: Monitor LLM token usage, consider cheaper models for screening phase

### User Experience
- **Latency Sensitivity**: Users expect near-instant results for sourcing/screening
  - Strategy: Parallel execution using LangGraph's Map-Reduce
- **Transparency**: Show progress, not just loading spinners
  - Strategy: Stream agent step descriptions

## External Dependencies
### APIs & Services
- **GitHub API** (primary data source)
  - REST API for search, repo metadata
  - GraphQL API for efficient multi-repo queries
  - Requires: Personal Access Token for authentication

- **LLM Providers**
  - Anthropic API (Claude 3.5 Sonnet) - code analysis
  - OpenAI API (GPT-4o, gpt-4o-mini) - fallback/cost optimization

- **Vercel Platform Services**
  - Edge Runtime (API routes)
  - KV Store (Redis caching)
  - Analytics (optional)

### Optional Services (Future)
- **Tavily/SerpAPI**: Competitive analysis, ecosystem research
- **Supabase**: Persistent storage for Phase 2 (historical reports, sharing)
