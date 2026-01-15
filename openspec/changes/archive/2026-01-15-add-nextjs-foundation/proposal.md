# Change: Add Next.js Foundation

## Why

To transition from command-line validation scripts to a production web application, we need to establish a Next.js full-stack framework. This is the critical bridge between our proven data/LLM pipelines (Proposal 1-2) and the Multi-Agent system (Proposal 4-7). Without this foundation, we cannot deliver user-facing features or validate the end-to-end user experience.

**Key Value**:
- Enable web-based interaction (vs terminal-only scripts)
- Establish API Routes that can evolve into streaming endpoints
- Create UI foundation for future Agent progress visualization
- Validate deployment pipeline to Vercel before building complex features

## What Changes

### Two Implementation Options

We propose **two alternative scopes** to allow flexibility based on timeline and risk tolerance:

#### Option A: Minimal Viable Foundation (Recommended for Speed)
- **Scope**: Single-page application + 1 API route
- **Timeline**: 1 day
- **Risk**: Lower (fewer moving parts)
- **Components**:
  - Minimal landing page with input field
  - `/api/analyze` endpoint calling existing `lib/analysis.ts`
  - Basic Markdown report rendering
  - No navigation, no complex layouts

#### Option B: Complete UI Foundation (Recommended for Quality)
- **Scope**: Multi-page application + layout system + UI component library
- **Timeline**: 2-3 days
- **Risk**: Higher (more integration points)
- **Components**:
  - Landing page (hero section + feature cards)
  - Workspace layout (chat sidebar + canvas area)
  - Reusable UI components (Shadcn/ui based)
  - Repository card components
  - Navigation and routing

**Recommendation**: Start with **Option A** for rapid validation, then upgrade to Option B if needed.

### Technical Additions

Both options include:
- ✅ Next.js 15 with App Router (TypeScript)
- ✅ Tailwind CSS for styling
- ✅ Shadcn/ui component primitives
- ✅ Vercel deployment configuration
- ✅ Environment variable management (.env.local)
- ✅ Integration with existing `lib/` modules

**Breaking Changes**: None (additive only)

## Impact

### Affected Specs
- **`frontend-ui`** (new capability) - Page structure and UI components
- **`api-routes`** (new capability) - Backend API endpoints

### Affected Code
- **New directories**:
  - `app/` - Next.js App Router pages and layouts
  - `components/` - Reusable React components
  - `app/api/` - API route handlers
  - `public/` - Static assets
- **Modified files**:
  - `package.json` - Add Next.js, React, Tailwind dependencies
  - `tsconfig.json` - Update for Next.js path aliases
  - `.gitignore` - Already includes Next.js patterns ✅
- **Unchanged**:
  - `lib/` - All existing data/LLM logic remains untouched

### Dependencies
- **Required**: Proposal 1 (GitHub Data Layer) ✅ Completed
- **Required**: Proposal 2 (LLM Analysis Pipeline) ✅ Completed
- **Blocks**: Proposal 4-8 (all future features depend on this foundation)

### Risks

1. **Framework Complexity**
   - *Risk*: Next.js App Router is new (vs Pages Router)
   - *Mitigation*: Start with simple patterns, avoid advanced features (Server Components, Suspense) in MVP

2. **Vercel Deployment**
   - *Risk*: Environment variables, build configuration issues
   - *Mitigation*: Test deployment early with minimal API route

3. **UI Framework Integration**
   - *Risk*: Shadcn/ui setup may introduce complexity
   - *Mitigation*: Only install components we actually use, not entire library

4. **Scope Creep**
   - *Risk*: Temptation to over-engineer UI before validating core functionality
   - *Mitigation*: Strict adherence to Option A scope unless explicitly choosing Option B

## Non-Goals (Out of Scope)

- ❌ Streaming API implementation (deferred to Proposal 8)
- ❌ Agent progress visualization (deferred to Proposal 8-9)
- ❌ Authentication/user accounts
- ❌ Database integration
- ❌ Advanced animations or micro-interactions
- ❌ Multi-Agent orchestration (Proposal 4-7)
- ❌ Mobile responsive design (desktop-first for MVP)

## Success Criteria

### Option A Acceptance
1. User can visit `http://localhost:3000`
2. User can input repository name (e.g., "facebook/react")
3. User can click "Analyze" button
4. System calls existing `lib/analysis.ts` logic
5. System displays Markdown report on the page
6. Deployment to Vercel succeeds

### Option B Acceptance (if chosen)
1. All Option A criteria ✅
2. Landing page matches `ui_spec.md` design intent
3. Workspace layout functions (resizable panels optional)
4. Chat sidebar placeholder exists
5. Canvas area displays sample repository cards
6. Navigation between pages works

## Migration Path

No migration needed - this is a greenfield addition.

**Rollback**: If deployment fails, we still have working `scripts/` for validation.

## Confirmed Decisions

All open questions have been resolved and confirmed (2026-01-14):

1. **API Route Strategy**: ✅ **CONFIRMED** - Use single `/api/analyze` endpoint
   - *Decision*: Monolithic endpoint for MVP, can refactor later if needed
   - *Rationale*: Simplifies initial implementation, reduces API overhead, easier to test

2. **Streaming**: ✅ **CONFIRMED** - Defer to Proposal 9 (not Proposal 8, roadmap renumbered)
   - *Decision*: Use traditional request-response in Proposal 3
   - *Rationale*: Streaming requires complete UI layout (Proposal 8) to display progress effectively

3. **Styling Approach**: ✅ **CONFIRMED** - Add GitHub Primer colors immediately
   - *Decision*: Configure `tailwind.config.js` with GitHub colors from the start
   - *Rationale*: Low cost (5 minutes), high alignment with ui_spec.md, prevents future refactoring

## Related Work

- **Prior Art**: Existing `scripts/test-llm.ts` demonstrates the analysis flow we need to expose via API
- **Design References**: `ui_spec.md` contains v0.dev prompts and component specifications
- **Technical References**: `technical_design.md` explains the Edge Runtime strategy for bypassing timeouts

## Alternatives Considered

### Alternative 1: Use Python FastAPI backend
- **Pros**: Reuse existing Python LangGraph patterns
- **Cons**: Requires separate deployment, increases operational complexity, breaks full-stack TypeScript vision
- **Verdict**: ❌ Rejected - Keep TypeScript monorepo

### Alternative 2: Skip Next.js, use Vite + Express
- **Pros**: Lighter weight, simpler mental model
- **Cons**: Miss out on Vercel Edge Runtime, no SSR/ISR for future optimizations, separate deployment for frontend/backend
- **Verdict**: ❌ Rejected - Next.js is the Vercel-native solution

### Alternative 3: Build UI in v0.dev first, then integrate
- **Pros**: High visual quality, rapid prototyping
- **Cons**: Integration friction, hard to maintain generated code, doesn't teach us the architecture
- **Verdict**: ⚠️ Partially Adopted - Use v0 for inspiration, but write code ourselves

## Cost Analysis

### Development Time
- **Option A**: 6-8 hours (1 day)
- **Option B**: 16-24 hours (2-3 days)

### Operational Cost
- **Vercel Hosting**: $0 (Hobby Plan includes Next.js hosting)
- **Additional Runtime**: No change (same Bun + Node.js as before)

### Risk Cost
- **Option A**: Low (minimal surface area for bugs)
- **Option B**: Medium (more UI code = more potential issues)

## Approval Checklist

Before starting implementation, confirm:
- [ ] Scope choice (Option A or Option B) is decided
- [ ] UI framework (Shadcn/ui) is approved
- [ ] Primer color scheme from `ui_spec.md` will be used
- [ ] Deployment target (Vercel) is confirmed
- [ ] `/api/analyze` endpoint design is understood
