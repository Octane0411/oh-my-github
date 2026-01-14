# Design: Next.js Foundation Architecture

## Context

oh-my-github currently exists as a collection of TypeScript modules (`lib/`) with command-line test scripts. We have proven that:
1. GitHub data can be fetched reliably (Proposal 1)
2. LLM analysis produces high-quality reports (Proposal 2)

Now we need to expose these capabilities through a web interface. The challenge is to create a foundation that:
- Works immediately (MVP) without over-engineering
- Scales to support future Multi-Agent streaming features (Proposal 4-8)
- Deploys seamlessly to Vercel with zero infrastructure cost

**Key Stakeholders**:
- End users (developers seeking open source projects)
- Future development team (needs maintainable architecture)
- Vercel deployment pipeline (must respect Edge Runtime constraints)

## Goals / Non-Goals

### Goals
1. **Rapid Validation**: Deploy a working web app within 1-3 days
2. **API Foundation**: Establish `/api/analyze` endpoint that integrates existing `lib/` code
3. **UI Foundation**: Create reusable component structure for future Agent UIs
4. **Deployment Success**: Achieve production deployment to Vercel with working environment variables
5. **Type Safety**: Maintain full TypeScript coverage across frontend and backend

### Non-Goals
1. ❌ Real-time streaming (Proposal 8)
2. ❌ Complex state management (Redux, Zustand)
3. ❌ Database persistence (Phase 2)
4. ❌ Authentication/authorization
5. ❌ Mobile optimization (desktop-first)
6. ❌ Advanced animations or transitions

## Decisions

### Decision 1: App Router vs Pages Router
**Chosen**: App Router

**Rationale**:
- App Router is the future of Next.js (Pages Router is legacy)
- Better support for Edge Runtime (needed for Proposal 8)
- Server Components enable future optimizations
- Colocation of routes and components improves maintainability

**Trade-offs**:
- ✅ Pro: Future-proof, better DX, streaming-ready
- ⚠️ Con: Slightly steeper learning curve
- ⚠️ Con: Some ecosystem libraries still Pages-focused

**Alternatives Considered**:
- Pages Router: More stable, but deprecated direction
- SPA with Vite: Lighter, but requires separate backend

### Decision 2: Styling System
**Chosen**: Tailwind CSS + Shadcn/ui

**Rationale**:
- Tailwind enables rapid prototyping without writing custom CSS
- Shadcn/ui provides accessible primitives that we can customize
- No runtime JS overhead (unlike Material-UI, Chakra)
- Copy-paste component model = no version lock-in
- Aligns with GitHub Primer aesthetic via custom Tailwind config

**Trade-offs**:
- ✅ Pro: Fast development, full customization, zero dependencies
- ⚠️ Con: Need to manually install each component (not a library)
- ❌ Con: Requires learning Radix UI patterns

**Alternatives Considered**:
- Raw Tailwind: More control, but need to build all components from scratch
- v0.dev generation: Fast, but hard to maintain and learn from
- Material-UI: Heavy, not aligned with GitHub aesthetic

### Decision 3: API Route Architecture (Monolithic vs Microservices)
**Chosen**: Single `/api/analyze` endpoint (Monolithic)

**Rationale**:
- Simplest to implement and test
- Matches current script structure (`scripts/test-llm.ts` does everything)
- Easy to refactor later when patterns emerge
- Reduces API call overhead (1 request vs 3+)

**Trade-offs**:
- ✅ Pro: Simple, fast to build, easy to debug
- ⚠️ Con: Harder to cache individual steps (search vs analysis)
- ❌ Con: May become too large if Multi-Agent logic is added

**Migration Path**:
```
Phase 1 (Now):  POST /api/analyze { repo: "owner/name" }
Phase 2 (Later): POST /api/search { query: "..." }
                 GET /api/repos/:owner/:name/metadata
                 POST /api/repos/:owner/:name/analyze
```

**Alternatives Considered**:
- Split endpoints immediately: Over-engineering for MVP
- GraphQL: Overkill for simple request/response pattern

### Decision 4: Data Flow Pattern
**Chosen**: Client → API Route → lib/ modules → Response

**Architecture**:
```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ POST /api/analyze
       │ { repo: "owner/name" }
       ▼
┌─────────────────┐
│  API Route      │
│  /api/analyze   │
│  route.ts       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  lib/github/    │
│  metadata.ts    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  lib/analysis.ts│
│  (LLM pipeline) │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Response       │
│  { report,      │
│    validation,  │
│    tokenUsage } │
└─────────────────┘
```

**Rationale**:
- Clean separation: UI (app/) → API (app/api/) → Logic (lib/)
- Easy to test each layer independently
- `lib/` remains framework-agnostic (can be reused in CLI or other contexts)

### Decision 5: Environment Variable Management
**Chosen**: `.env.local` for secrets + Vercel Dashboard for production

**Strategy**:
```bash
# .env.local (local development, gitignored)
GITHUB_TOKEN=ghp_xxxxx
DEEPSEEK_V3_API_KEY=sk-xxxxx

# Vercel Dashboard (production)
- Same variables configured via Vercel UI
- Automatically injected at build + runtime
```

**Rationale**:
- `.env.local` is Next.js convention (already in `.gitignore`)
- Vercel Dashboard is the canonical source of truth for prod
- No need for .env.production file (security risk)

### Decision 6: Two-Phase Implementation Strategy
**Chosen**: Support both Option A (Minimal) and Option B (Complete)

**Option A: Minimal Viable Foundation**
```
app/
├── page.tsx          # Single page with input + results
├── layout.tsx        # Root layout (minimal)
└── api/
    └── analyze/
        └── route.ts  # POST endpoint

components/
└── AnalysisForm.tsx  # Input field + submit button
```

**Option B: Complete UI Foundation**
```
app/
├── page.tsx              # Landing page
├── workspace/
│   └── page.tsx          # Main workspace
├── layout.tsx            # Root layout with nav
└── api/
    └── analyze/
        └── route.ts

components/
├── ui/                   # Shadcn/ui primitives
│   ├── button.tsx
│   ├── input.tsx
│   └── card.tsx
├── HeroInput.tsx         # Landing page input
├── ChatSidebar.tsx       # Left panel
├── CanvasArea.tsx        # Right panel
└── RepoCard.tsx          # Repository display card
```

**Decision Matrix**:
| Criteria              | Option A | Option B |
|-----------------------|----------|----------|
| Development Time      | 1 day    | 2-3 days |
| Complexity            | Low      | Medium   |
| Future-Proof          | Medium   | High     |
| User Experience       | Basic    | Polished |
| Risk                  | Low      | Medium   |

**Recommendation**: Start with Option A, upgrade to B after validating core flow.

## Component Architecture

### Shared Components (Both Options)

#### 1. AnalysisForm Component
```typescript
// components/AnalysisForm.tsx
interface AnalysisFormProps {
  onSubmit: (repo: string) => Promise<void>;
  isLoading: boolean;
}

// Features:
// - Input field with validation (owner/name format)
// - Submit button with loading state
// - Error display
```

#### 2. ReportDisplay Component
```typescript
// components/ReportDisplay.tsx
interface ReportDisplayProps {
  report: string;           // Markdown content
  validation: ValidationResult;
  tokenUsage: TokenUsage;
}

// Features:
// - Markdown rendering (react-markdown)
// - Token usage badge
// - Validation warnings
```

### Option B Additional Components

#### 3. Layout System
```typescript
// components/ResizableLayout.tsx
// Two-panel layout: Chat (30%) + Canvas (70%)
// Uses react-resizable-panels or CSS Grid

// components/ChatSidebar.tsx
// Placeholder for future Agent conversation UI

// components/CanvasArea.tsx
// Main content area, displays repository cards or reports
```

## API Design

### Endpoint: POST /api/analyze

**Request**:
```typescript
interface AnalyzeRequest {
  repo: string;  // Format: "owner/name" (e.g., "facebook/react")
}
```

**Response** (Success):
```typescript
interface AnalyzeResponse {
  success: true;
  data: {
    repository: RepositoryMetadata;
    report: {
      content: string;      // Markdown
      format: "markdown";
    };
    validation: ValidationResult;
    tokenUsage: {
      totalTokens: number;
      estimatedCost: number;
    };
  };
}
```

**Response** (Error):
```typescript
interface AnalyzeErrorResponse {
  success: false;
  error: {
    code: "INVALID_REPO" | "GITHUB_API_ERROR" | "LLM_ERROR" | "RATE_LIMIT";
    message: string;
    details?: unknown;
  };
}
```

**Implementation Flow**:
```typescript
// app/api/analyze/route.ts
export async function POST(request: Request) {
  // 1. Parse and validate request
  const { repo } = await request.json();
  if (!repo || !repo.includes('/')) {
    return NextResponse.json({
      success: false,
      error: { code: 'INVALID_REPO', message: '...' }
    }, { status: 400 });
  }

  // 2. Call GitHub API
  const [owner, name] = repo.split('/');
  const metadata = await extractRepoMetadata({ owner, name });

  // 3. Call LLM analysis
  const result = await analyzeRepository(metadata, ...);

  // 4. Return response
  return NextResponse.json({
    success: true,
    data: {
      repository: metadata,
      report: result.report,
      validation: result.validation,
      tokenUsage: result.tokenUsage,
    },
  });
}
```

## Styling System

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // GitHub Primer colors (from ui_spec.md)
        github: {
          canvas: '#ffffff',
          primary: '#2da44e',
          border: '#d0d7de',
          text: '#24292f',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
};
```

### Shadcn/ui Setup
```bash
# Install only components we need (not entire library)
npx shadcn@latest init
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add badge
```

Components will be copied to `components/ui/` and fully customizable.

## Integration Points

### 1. GitHub Data Layer (lib/github/)
```typescript
// Already implemented in Proposal 1
import { createGitHubClient } from '@/lib/github/client';
import { extractRepoMetadata } from '@/lib/github/metadata';

// Usage in API route:
const client = createGitHubClient(process.env.GITHUB_TOKEN!);
const metadata = await extractRepoMetadata(client, { owner, name });
```

### 2. LLM Analysis Pipeline (lib/llm/ + lib/reports/)
```typescript
// Already implemented in Proposal 2
import { analyzeRepository } from '@/lib/analysis';

// Usage in API route:
const result = await analyzeRepository(
  repositoryMetadata,
  calculatedMetrics,
  filteredIssues,
  { detailLevel: 'detailed', reportFormat: 'markdown' }
);
```

### 3. Environment Variables
```typescript
// API route will access:
process.env.GITHUB_TOKEN        // GitHub API authentication
process.env.DEEPSEEK_V3_API_KEY // LLM provider
```

Must be configured in:
- `.env.local` (local development)
- Vercel Dashboard → Settings → Environment Variables (production)

## Deployment Strategy

### Vercel Configuration
```json
// vercel.json (optional, defaults are usually sufficient)
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "bun install",
  "framework": "nextjs"
}
```

### Environment Variables Checklist
```bash
# Required in Vercel Dashboard:
GITHUB_TOKEN=ghp_...           # Production PAT
DEEPSEEK_V3_API_KEY=sk-...     # Production API key

# Node.js version (if needed):
NODE_VERSION=18.x  # or latest LTS
```

### Deployment Validation
1. Push to GitHub → Vercel auto-deploys
2. Check build logs for errors
3. Test `/api/analyze` endpoint with curl:
   ```bash
   curl -X POST https://your-app.vercel.app/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"repo": "facebook/react"}'
   ```
4. Verify UI loads and form submits

## Error Handling Strategy

### API Route Error Handling
```typescript
try {
  // GitHub API call
} catch (error) {
  if (error.status === 404) {
    return NextResponse.json({
      success: false,
      error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' }
    }, { status: 404 });
  }
  if (error.status === 403) {
    return NextResponse.json({
      success: false,
      error: { code: 'RATE_LIMIT', message: 'GitHub API rate limit exceeded' }
    }, { status: 429 });
  }
  // Generic error
  return NextResponse.json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: error.message }
  }, { status: 500 });
}
```

### Frontend Error Handling
```typescript
// components/AnalysisForm.tsx
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  setError(null);
  try {
    const response = await fetch('/api/analyze', { ... });
    const data = await response.json();

    if (!data.success) {
      setError(data.error.message);
      return;
    }

    // Success: display report
  } catch (err) {
    setError('Network error. Please try again.');
  }
};
```

## Testing Strategy

### Manual Testing (MVP)
```bash
# 1. Local development
bun run dev  # or npm run dev
# Visit http://localhost:3000
# Test with input: "facebook/react"

# 2. API endpoint test
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo": "facebook/react"}'

# 3. Deployment test
# Push to GitHub, check Vercel deployment
# Test production URL
```

### Future Testing (Post-MVP)
- [ ] Playwright E2E tests
- [ ] API route unit tests (Vitest)
- [ ] Component tests (React Testing Library)

## Performance Considerations

### Current Constraints
- **GitHub API**: ~15-20 calls per analysis (from Proposal 1)
- **LLM API**: ~1,200 tokens, 21s processing time (from Proposal 2)
- **Total latency**: ~25-30 seconds for full analysis

### Optimization Opportunities (Future)
1. **Caching** (Proposal 10): Cache GitHub metadata for 24h
2. **Streaming** (Proposal 8): Stream progress updates to prevent timeout perception
3. **Parallel requests**: Fetch GitHub data while LLM is thinking
4. **Edge Runtime**: Use for lightweight routes (not analysis, which needs long timeout)

## Migration Plan

No migration needed (greenfield). Existing `scripts/` remain functional for testing.

## Risks / Trade-offs

### Risk 1: App Router Learning Curve
- **Impact**: Medium (team may struggle with new patterns)
- **Mitigation**: Start simple, avoid Server Components initially, use Client Components with `'use client'`

### Risk 2: Vercel Build Failures
- **Impact**: High (blocks deployment)
- **Mitigation**: Test locally with `bun run build` before pushing, check Vercel logs carefully

### Risk 3: Environment Variable Issues
- **Impact**: High (API calls will fail)
- **Mitigation**: Add validation in API route to check `process.env.GITHUB_TOKEN` exists, return clear error if missing

### Risk 4: Shadcn/ui Setup Complexity
- **Impact**: Low (can fallback to raw Tailwind)
- **Mitigation**: Only install components we use, don't over-customize initially

### Trade-off: Monolithic API vs Split Endpoints
- **Chosen**: Monolithic (`/api/analyze` does everything)
- **Cost**: Harder to cache individual steps, single point of failure
- **Benefit**: Simpler to build and test, matches current script structure
- **Future**: Can refactor to split endpoints when caching strategy is clear

## Confirmed Decisions (Design Details)

All open questions have been resolved and confirmed (2026-01-14):

1. **Loading State UI**: ✅ **CONFIRMED** - Use simple Spinner
   - *Decision*: Display spinner with "Analyzing..." text during API call
   - *Implementation*: Use Shadcn/ui Spinner component or simple CSS animation
   - *Rationale*: Simpler implementation (~5 min), sufficient for MVP. Loading skeletons deferred to Proposal 10 (UI Polish)

2. **Result Persistence**: ✅ **CONFIRMED** - Store in LocalStorage
   - *Decision*: Save analysis result to LocalStorage after successful completion
   - *Implementation*:
     ```typescript
     // Save after success
     localStorage.setItem('lastAnalysis', JSON.stringify(result));

     // Restore on mount
     const saved = localStorage.getItem('lastAnalysis');
     if (saved) setResult(JSON.parse(saved));
     ```
   - *Rationale*: Prevents data loss on accidental refresh, improves UX. Low cost (~10 lines of code)
   - *Considerations*: Handle LocalStorage quota limits (5-10MB), add error handling for parse failures

3. **Repository Pre-validation**: ✅ **CONFIRMED** - No pre-validation
   - *Decision*: Directly call analysis API, let GitHub API return 404 if repo doesn't exist
   - *Rationale*:
     - Simplifies logic (no extra API call)
     - Avoids race conditions (repo could be deleted between validation and analysis)
     - GitHub API error messages are clear enough
   - *Error Handling*: Map GitHub 404 to user-friendly message in frontend

4. **Demo Button**: ✅ **CONFIRMED** - Add "Try Example" button
   - *Decision*: Add button next to input field that auto-fills "facebook/react" and triggers analysis
   - *Implementation*:
     ```tsx
     <button onClick={() => {
       setRepo("facebook/react");
       handleAnalyze("facebook/react");
     }}>
       Try Example
     </button>
     ```
   - *Rationale*:
     - Lowers barrier to entry (users don't need to know repo names)
     - Useful for demos and testing
     - Low implementation cost (~10 lines of code)
   - *Alternative repos to consider*: facebook/react, vercel/next.js, microsoft/vscode

## Appendix: File Structure

### Option A (Minimal)
```
oh-my-github/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Single page
│   ├── globals.css         # Tailwind imports
│   └── api/
│       └── analyze/
│           └── route.ts    # POST endpoint
├── components/
│   ├── AnalysisForm.tsx
│   └── ReportDisplay.tsx
├── lib/                    # Existing (unchanged)
├── public/                 # Static assets
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### Option B (Complete)
```
oh-my-github/
├── app/
│   ├── layout.tsx              # Root layout with nav
│   ├── page.tsx                # Landing page
│   ├── workspace/
│   │   └── page.tsx            # Main workspace
│   ├── globals.css
│   └── api/
│       └── analyze/
│           └── route.ts
├── components/
│   ├── ui/                     # Shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── HeroInput.tsx           # Landing page
│   ├── ChatSidebar.tsx         # Workspace left
│   ├── CanvasArea.tsx          # Workspace right
│   ├── RepoCard.tsx            # Repository card
│   └── ReportDisplay.tsx
├── lib/                        # Existing
├── public/
├── next.config.js
├── tailwind.config.js
└── package.json
```

## References

- Next.js App Router Docs: https://nextjs.org/docs/app
- Shadcn/ui: https://ui.shadcn.com/
- Vercel Deployment: https://vercel.com/docs/deployments
- Project UI Spec: `/ui_spec.md`
- Technical Design: `/technical_design.md`
