# Tasks: Add Next.js Foundation

## Implementation Path

This task list supports **both Option A (Minimal) and Option B (Complete)**. Tasks marked with 🅰️ are Option A only, 🅱️ are Option B only, and ⭐ are shared.

**Recommendation**: Complete all ⭐ and 🅰️ tasks first (Option A MVP), then decide whether to proceed with 🅱️ tasks (Option B upgrades).

---

## Phase 1: Project Setup ⭐

### 1.1 Initialize Next.js Project
- [ ] 1.1.1 Run `bunx create-next-app@latest` with App Router, TypeScript, Tailwind, src/ directory = No
  - Choose: Yes to TypeScript, Yes to Tailwind CSS, No to src/ directory, Yes to App Router, No to customize import alias
- [ ] 1.1.2 Verify `app/`, `public/`, `next.config.js`, `tailwind.config.js` are created
- [ ] 1.1.3 Test dev server: `bun run dev` should start at http://localhost:3000
- [ ] 1.1.4 Commit: "chore: initialize Next.js 15 project with App Router"

### 1.2 Configure Tailwind with GitHub Primer Colors
- [ ] 1.2.1 Update `tailwind.config.js` to extend theme with GitHub colors (see design.md)
  - Add `github.canvas`, `github.primary`, `github.border`, `github.text`
  - Add system font stack to `fontFamily.sans`
- [ ] 1.2.2 Test color application in `app/page.tsx` (e.g., `bg-github-canvas`, `text-github-text`)
- [ ] 1.2.3 Commit: "style: add GitHub Primer color scheme to Tailwind"

### 1.3 Install Shadcn/ui Foundation
- [ ] 1.3.1 Run `bunx shadcn@latest init`
  - Choose style: Default, base color: Neutral, CSS variables: Yes
- [ ] 1.3.2 Install core components: `bunx shadcn@latest add button input card badge`
- [ ] 1.3.3 Verify `components/ui/` directory is created with button.tsx, input.tsx, card.tsx, badge.tsx
- [ ] 1.3.4 Test a button in `app/page.tsx` to verify Shadcn/ui works
- [ ] 1.3.5 Commit: "feat: install Shadcn/ui core components"

### 1.4 Install Additional Dependencies
- [ ] 1.4.1 Install Markdown renderer: `bun add react-markdown remark-gfm`
- [ ] 1.4.2 Install type definitions: `bun add -D @types/react @types/react-dom`
- [ ] 1.4.3 Update `package.json` scripts if needed (dev, build, start should exist)
- [ ] 1.4.4 Commit: "deps: add react-markdown and type definitions"

---

## Phase 2: API Layer Implementation ⭐

### 2.1 Create API Route Structure
- [ ] 2.1.1 Create directory `app/api/analyze/`
- [ ] 2.1.2 Create file `app/api/analyze/route.ts` with POST handler skeleton
  - Import NextResponse from 'next/server'
  - Export async function POST(request: Request)
- [ ] 2.1.3 Add basic request validation (check for `repo` field)
- [ ] 2.1.4 Test with curl: `curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"repo": "test"}'`
- [ ] 2.1.5 Commit: "feat: create /api/analyze endpoint skeleton"

### 2.2 Integrate GitHub Data Layer
- [ ] 2.2.1 Import `createGitHubClient` and `extractRepoMetadata` from `@/lib/github`
- [ ] 2.2.2 Parse `owner` and `name` from `repo` field (format: "owner/name")
- [ ] 2.2.3 Call `extractRepoMetadata` with validated parameters
- [ ] 2.2.4 Handle errors: 404 (repo not found), 403 (rate limit), 500 (generic)
- [ ] 2.2.5 Return partial response with metadata only (before LLM integration)
- [ ] 2.2.6 Test with curl using valid repo: `{"repo": "facebook/react"}`
- [ ] 2.2.7 Commit: "feat: integrate GitHub metadata extraction in API"

### 2.3 Integrate LLM Analysis Pipeline
- [ ] 2.3.1 Import `analyzeRepository` from `@/lib/analysis`
- [ ] 2.3.2 Call analysis function with extracted metadata
- [ ] 2.3.3 Pass options: `{ detailLevel: 'detailed', reportFormat: 'markdown' }`
- [ ] 2.3.4 Structure response according to AnalyzeResponse interface (see design.md)
- [ ] 2.3.5 Add error handling for LLM errors (timeout, API key missing)
- [ ] 2.3.6 Test end-to-end: should return full report with validation and token usage
- [ ] 2.3.7 Commit: "feat: complete /api/analyze with LLM integration"

### 2.4 Environment Variable Validation
- [ ] 2.4.1 Add check at top of route: verify `process.env.GITHUB_TOKEN` exists
- [ ] 2.4.2 Add check for `process.env.DEEPSEEK_V3_API_KEY`
- [ ] 2.4.3 Return clear error if either is missing: `{ success: false, error: { code: 'MISSING_ENV_VAR', ... } }`
- [ ] 2.4.4 Test by temporarily removing env vars and verifying error response
- [ ] 2.4.5 Commit: "feat: add environment variable validation to API"

---

## Phase 3: Frontend - Option A (Minimal) 🅰️

### 3.1 Create Minimal Landing Page
- [ ] 3.1.1 Clean up default `app/page.tsx`, remove boilerplate
- [ ] 3.1.2 Create centered layout with heading "oh-my-github" and subtitle
- [ ] 3.1.3 Add GitHub Primer colors: `bg-github-canvas`, `text-github-text`
- [ ] 3.1.4 Ensure page is client component: add `'use client'` directive
- [ ] 3.1.5 Commit: "feat: create minimal landing page structure"

### 3.2 Build AnalysisForm Component
- [ ] 3.2.1 Create `components/AnalysisForm.tsx`
- [ ] 3.2.2 Add state: `repo` (string), `isLoading` (boolean), `error` (string | null)
- [ ] 3.2.3 Build UI: Shadcn/ui Input + Button
  - Input placeholder: "Enter repository (e.g., facebook/react)"
  - Button: "Analyze" with loading state
- [ ] 3.2.4 Add form validation: check format "owner/name" with regex
- [ ] 3.2.5 Implement handleSubmit: POST to `/api/analyze`, set loading state
- [ ] 3.2.6 Handle API errors: display error message below form
- [ ] 3.2.7 Emit `onSuccess` callback with analysis result
- [ ] 3.2.8 Test form submission with valid and invalid inputs
- [ ] 3.2.9 Commit: "feat: create AnalysisForm component with API integration"

### 3.3 Build ReportDisplay Component
- [ ] 3.3.1 Create `components/ReportDisplay.tsx`
- [ ] 3.3.2 Accept props: `report` (string), `validation` (object), `tokenUsage` (object)
- [ ] 3.3.3 Install and import `react-markdown` with `remark-gfm`
- [ ] 3.3.4 Render Markdown content with basic styling
- [ ] 3.3.5 Add token usage badge at top: "Tokens: X | Cost: $Y"
- [ ] 3.3.6 Add validation status indicator (✅ or ⚠️) if validation.isValid === false
- [ ] 3.3.7 Style report container: max-width, padding, GitHub-inspired typography
- [ ] 3.3.8 Test with sample Markdown report
- [ ] 3.3.9 Commit: "feat: create ReportDisplay component with Markdown rendering"

### 3.4 Integrate Components into Landing Page
- [ ] 3.4.1 Import AnalysisForm and ReportDisplay into `app/page.tsx`
- [ ] 3.4.2 Add state in page: `analysisResult` (object | null)
- [ ] 3.4.3 Render AnalysisForm always, pass `onSuccess` handler to set result
- [ ] 3.4.4 Conditionally render ReportDisplay when `analysisResult` exists
- [ ] 3.4.5 Add "Analyze Another" button to clear result and show form again
- [ ] 3.4.6 Test full flow: input repo → submit → see loading → see report
- [ ] 3.4.7 Commit: "feat: integrate analysis flow into landing page (Option A MVP complete)"

---

## Phase 4: Frontend - Option B (Complete) 🅱️

**Only proceed if Option B is chosen after Option A validation**

### 4.1 Create Layout System
- [ ] 4.1.1 Create `components/ResizableLayout.tsx` with two-panel grid (30% / 70%)
- [ ] 4.1.2 Use CSS Grid or `react-resizable-panels` library (if chosen)
- [ ] 4.1.3 Test layout responds to window resize
- [ ] 4.1.4 Commit: "feat: create resizable two-panel layout"

### 4.2 Build ChatSidebar Component
- [ ] 4.2.1 Create `components/ChatSidebar.tsx`
- [ ] 4.2.2 Add placeholder UI: "Chat Interface (Coming Soon)"
- [ ] 4.2.3 Style with GitHub colors, add border-right
- [ ] 4.2.4 Commit: "feat: add ChatSidebar placeholder"

### 4.3 Build CanvasArea Component
- [ ] 4.3.1 Create `components/CanvasArea.tsx`
- [ ] 4.3.2 Add placeholder UI: "Trending Alphas" grid
- [ ] 4.3.3 Render 3-4 sample RepoCard components
- [ ] 4.3.4 Commit: "feat: add CanvasArea with sample cards"

### 4.4 Build RepoCard Component
- [ ] 4.4.1 Create `components/RepoCard.tsx`
- [ ] 4.4.2 Use Shadcn/ui Card component as base
- [ ] 4.4.3 Display: Repo name, description, tech stack badges
- [ ] 4.4.4 Add "Deep Dive" button (non-functional in MVP)
- [ ] 4.4.5 Style with GitHub aesthetic
- [ ] 4.4.6 Commit: "feat: create RepoCard component"

### 4.5 Build Landing Page (Enhanced)
- [ ] 4.5.1 Create enhanced `app/page.tsx` for landing
- [ ] 4.5.2 Build HeroInput component (large, centered, glowing input field)
- [ ] 4.5.3 Add feature cards below hero (3 cards: "Find Alpha", "AI Analysis", "Save Time")
- [ ] 4.5.4 Add navigation button to /workspace
- [ ] 4.5.5 Commit: "feat: create enhanced landing page with hero section"

### 4.6 Create Workspace Page
- [ ] 4.6.1 Create `app/workspace/page.tsx`
- [ ] 4.6.2 Import ResizableLayout, ChatSidebar, CanvasArea
- [ ] 4.6.3 Arrange components: ChatSidebar on left, CanvasArea on right
- [ ] 4.6.4 Move analysis logic from landing page to workspace
- [ ] 4.6.5 Test navigation: landing → workspace
- [ ] 4.6.6 Commit: "feat: create workspace page with split layout (Option B complete)"

### 4.7 Add Navigation
- [ ] 4.7.1 Update `app/layout.tsx` to include header with nav links
- [ ] 4.7.2 Add nav links: "Home" → `/`, "Workspace" → `/workspace`
- [ ] 4.7.3 Style header with GitHub colors
- [ ] 4.7.4 Commit: "feat: add navigation header to root layout"

---

## Phase 5: Testing & Validation ⭐

### 5.1 Local Testing
- [ ] 5.1.1 Test all routes load without errors: `/`, `/workspace` (if Option B)
- [ ] 5.1.2 Test API endpoint with multiple repositories:
  - Valid repo: `facebook/react`
  - Invalid format: `just-a-name`
  - Non-existent repo: `fake/repo123456`
- [ ] 5.1.3 Verify error handling displays correctly in UI
- [ ] 5.1.4 Check browser console for errors or warnings
- [ ] 5.1.5 Test responsive behavior (desktop-first, but should not break)
- [ ] 5.1.6 Document any issues in proposal or design.md

### 5.2 Build Validation
- [ ] 5.2.1 Run `bun run build` locally
- [ ] 5.2.2 Fix any TypeScript errors or build warnings
- [ ] 5.2.3 Run `bun run start` and verify production build works
- [ ] 5.2.4 Check bundle size: `ls -lh .next/static`
- [ ] 5.2.5 Commit: "test: validate production build"

### 5.3 Environment Setup for Deployment
- [ ] 5.3.1 Create `.env.local.example` with placeholder values:
  ```
  GITHUB_TOKEN=ghp_your_token_here
  DEEPSEEK_V3_API_KEY=sk_your_key_here
  ```
- [ ] 5.3.2 Verify `.env.local` is in `.gitignore` (already exists)
- [ ] 5.3.3 Document environment variable setup in README or deployment guide
- [ ] 5.3.4 Commit: "docs: add environment variable template"

---

## Phase 6: Deployment ⭐

### 6.1 Vercel Deployment Setup
- [ ] 6.1.1 Push code to GitHub repository
- [ ] 6.1.2 Connect repository to Vercel (vercel.com)
- [ ] 6.1.3 Configure project settings:
  - Framework Preset: Next.js
  - Build Command: (auto-detected)
  - Install Command: `bun install` or npm install
- [ ] 6.1.4 Add environment variables in Vercel Dashboard:
  - `GITHUB_TOKEN` (production value)
  - `DEEPSEEK_V3_API_KEY` (production value)
- [ ] 6.1.5 Deploy: Vercel will auto-deploy on push

### 6.2 Deployment Validation
- [ ] 6.2.1 Wait for build to complete, check build logs for errors
- [ ] 6.2.2 Visit deployed URL (e.g., `https://oh-my-github.vercel.app`)
- [ ] 6.2.3 Test homepage loads correctly
- [ ] 6.2.4 Test analysis flow with a sample repository
- [ ] 6.2.5 Verify API route responds (check Network tab in browser DevTools)
- [ ] 6.2.6 Test error handling with invalid input
- [ ] 6.2.7 Check Vercel Function logs for any runtime errors
- [ ] 6.2.8 Document deployment URL in README.md

### 6.3 Post-Deployment Checklist
- [ ] 6.3.1 Verify all environment variables are set correctly in Vercel
- [ ] 6.3.2 Test with multiple repositories to ensure API quota is working
- [ ] 6.3.3 Monitor Vercel analytics for errors or slow requests
- [ ] 6.3.4 Share deployment URL with stakeholders for feedback
- [ ] 6.3.5 Create a GitHub Release or tag (e.g., `v0.1.0-mvp`)

---

## Phase 7: Documentation ⭐

### 7.1 Update Project Documentation
- [ ] 7.1.1 Update README.md with:
  - Link to deployed app
  - Local development instructions
  - Environment variable setup
  - How to run development server
- [ ] 7.1.2 Add CONTRIBUTING.md if not exists (basic guidelines)
- [ ] 7.1.3 Update openspec_roadmap.md: mark Proposal 3 as completed

### 7.2 Create Deployment Guide
- [ ] 7.2.1 Document Vercel deployment steps in `/docs/deployment.md`
- [ ] 7.2.2 Include screenshots or step-by-step instructions
- [ ] 7.2.3 Document environment variable requirements

### 7.3 Code Documentation
- [ ] 7.3.1 Ensure all API routes have JSDoc comments
- [ ] 7.3.2 Ensure all components have prop type definitions
- [ ] 7.3.3 Add inline comments for complex logic (especially in API route)

---

## Completion Criteria

### Option A (Minimal) - Definition of Done
- [x] All ⭐ and 🅰️ tasks completed
- [x] User can visit deployed URL
- [x] User can input repository and see analysis report
- [x] API route successfully integrates GitHub + LLM pipelines
- [x] No console errors or build warnings
- [x] Deployment successful on Vercel

### Option B (Complete) - Definition of Done
- [x] All ⭐, 🅰️, and 🅱️ tasks completed
- [x] Landing page and workspace pages exist
- [x] Layout system with chat sidebar and canvas area
- [x] Navigation between pages works
- [x] All Option A criteria also met

---

## Dependencies

**Required Before Starting**:
- ✅ Proposal 1 (GitHub Data Layer) - Completed
- ✅ Proposal 2 (LLM Analysis Pipeline) - Completed

**Blocks**:
- Proposal 4 (Query Translator Agent)
- Proposal 5-7 (Scout, Screener, Auditor Agents)
- Proposal 8 (Streaming UI)
- Proposal 9 (UI Polish)

---

## Estimated Timeline

| Phase | Option A | Option B |
|-------|----------|----------|
| 1. Setup | 2 hours | 2 hours |
| 2. API Layer | 3 hours | 3 hours |
| 3. Frontend (Basic) | 3 hours | - |
| 4. Frontend (Enhanced) | - | 10 hours |
| 5. Testing | 1 hour | 2 hours |
| 6. Deployment | 1 hour | 1 hour |
| 7. Documentation | 1 hour | 1 hour |
| **Total** | **~11 hours (1.5 days)** | **~19 hours (2.5 days)** |

**Buffer**: Add 20% for unexpected issues → **Option A: 1-2 days, Option B: 2-3 days**

---

## Notes

- **Parallel Work**: Phases 2 (API) and 3 (Frontend) can be developed in parallel if multiple developers
- **Testing Strategy**: Manual testing for MVP, automated tests deferred to post-MVP
- **Rollback Plan**: If deployment fails, scripts in `/scripts` still work for validation
- **Scope Control**: Resist temptation to add features not in spec (e.g., caching, streaming, database)
