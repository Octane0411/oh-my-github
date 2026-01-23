# OpenSpec Roadmap (Vision 3.0: The Agent Skill Factory)

> **Strategic Pivot (2026-01-21)**: 
> From "GitHub Search Engine" to **"GitHub-to-Skill Factory"**.
> We are building the bridge between GitHub's open-source tools and Claude's Agent Skills.

## 🌟 Vision 3.0
**Oh-My-GitHub** helps users find suitable GitHub repositories and automatically converts them into **Agent Skills** that Claude can use.

---

## 📋 Roadmap

### Phase 1-4: Foundation (Completed) ✅
*Building the intelligent search and agent infrastructure.*
- **Phase 1-2**: Web Infrastructure & PoC (Completed)
- **Phase 3**: Smart Search Core (Completed)
  - Query Translator, Scout, Screener, Multi-dimensional Scoring.
- **Phase 4**: Agent Coordinator (Completed)
  - Intent recognition, Conversation management, LangGraph workflow.

---

### Phase 5: Intelligent Discovery (Backend) ✅ Completed
*Finding repositories that can be turned into skills.*
- **Proposal**: `011-github-to-skills`
- **Spec**: `docs/specs/acs-scoring-system.md` (Completed)
- **Architecture**: **Supervisor (Vercel AI SDK) + Sub-Graph (LangGraph)**
- **Goal**: Build the "Consultant" supervisor and the "Discovery" sub-graph.
- **Key Tasks**:
  - [x] **New Pipeline**: Create `lib/agents/h2-skill-discovery` (separate from h1).
  - [x] **Consultant Agent (Supervisor)**: Implement the outer loop using Vercel AI SDK `streamText` with Tool Calling.
  - [x] **Discovery Pipeline (Sub-Graph)**: Encapsulate the Scout & Screener logic into a callable LangGraph tool.
  - [x] **ACS Implementation**: Implement the LLM-based scoring logic as a node in the Discovery Graph.

---

### Phase 6: The Factory Interface (Frontend) 🔴 Next Focus
*The conversational interface where users negotiate with the Agent to build skills.*
- **Prototype**: `prototype_skill_factory.html` (Approved MVP)
- **Spec**: `docs/specs/ui-skill-factory.md` (Revised)
- **Goal**: Implement the React/Next.js version of the approved prototype.
- **Key Features**:
  - **Consultation Mode**: Multi-turn chat to clarify user intent.
  - **Direct Fabrication**: Shortcut to generate skills directly from URLs.
  - **Streaming Chat**: Perplexity-style interaction.
  - **ACS Score Visualization**: Display compatibility scores.
  - **Skill Generation Progress Logs**: Terminal style feedback.

---

### Phase 7: The Skill Fabricator (Backend) 🟡 Future
*The core engine that generates the Skill artifacts.*
- **Proposal**: `011-github-to-skills`
- **Architecture**: **Sub-Graph (LangGraph)**
- **Goal**: Build the "Fabrication" sub-graph tool.
- **Key Tasks**:
  - [ ] **New Pipeline**: Create `lib/agents/h3-skill-fabrication`.
  - [ ] **Fabrication Pipeline**: Create a new LangGraph for the build process (Reader -> Synthesizer -> Packager).
  - [ ] **Meta-Skill Integration**: Integrate Claude's official "Skill-Creator Skill" logic into the Synthesizer node.
  - [ ] **Artifact Packager**: Implement Zip export functionality.

---

### Phase 8: The Skill Store (P2) ⚪ Future
*A repository of pre-built, high-quality skills.*
- **Goal**: "DeepWiki" style showcase for popular tools.
- **Key Tasks**:
  - [ ] Pre-generate skills for top 100 tools.
  - [ ] Web UI for browsing skills without chat.

---

## 📅 Timeline Estimate (MVP)

| Phase | Focus | Est. Time | Status |
|-------|-------|-----------|--------|
| **5. Discovery** | Supervisor + Discovery Graph | 2-3 Days | ✅ Done |
| **6. Chat UI** | Frontend Implementation | 3-4 Days | 🔴 Next |
| **7. Fabricator** | Fabrication Graph | 3-4 Days | 🟡 Future |

## 🚀 Immediate Next Steps
1. **Frontend**: Implement the **Chat UI** based on `prototype_skill_factory.html`.
2. **Frontend**: Integrate the Chat UI with the Consultant Agent API.
