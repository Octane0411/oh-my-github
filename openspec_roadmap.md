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

### Phase 5: The Factory Interface (Chat UI) 🚀 Ready for Implementation
*The conversational interface where users negotiate with the Agent to build skills.*
- **Proposal**: `009-chat-ui-draft` / `upgrade-to-chat-ui`
- **Prototype**: `prototype_skill_factory.html` (Approved MVP)
- **Goal**: Implement the React/Next.js version of the approved prototype.
- **Key Features**:
  - Streaming Chat (Perplexity-style)
  - ACS Score Visualization
  - Skill Generation Progress Logs (Terminal style)
  - Download Artifacts

---

### Phase 6: Intelligent Discovery (P0) 🔴 Next Focus
*Finding repositories that can be turned into skills.*
- **Proposal**: `011-github-to-skills`
- **Spec**: `docs/specs/acs-scoring-system.md` (Completed)
- **Goal**: Optimize the Search Agent to prioritize "tool-like" repos and implement ACS scoring.
- **Key Tasks**:
  - [ ] **Scout Upgrade**: Prioritize `setup.py`, `requirements.txt`, `cli.py`.
  - [ ] **ACS Implementation**: Implement the LLM-based scoring logic defined in the spec.
  - [ ] **UI Integration**: Display ACS badges in search results.

---

### Phase 7: The Skill Fabricator (P1) 🟠 Planned
*The core engine that generates the Skill artifacts.*
- **Proposal**: `011-github-to-skills`
- **Goal**: Generate `SKILL.md` and wrapper scripts automatically.
- **Key Tasks**:
  - [ ] **Meta-Skill Integration**: Integrate Claude's official "Skill-Creator Skill" logic.
  - [ ] **Synthesizer Upgrade**: Generate `SKILL.md` based on README usage patterns.
  - [ ] **Artifact Packager**: Implement Zip export functionality.

---

### Phase 8: The Skill Store (P2) 🟡 Future
*A repository of pre-built, high-quality skills.*
- **Goal**: "DeepWiki" style showcase for popular tools.
- **Key Tasks**:
  - [ ] Pre-generate skills for top 100 tools.
  - [ ] Web UI for browsing skills without chat.

---

## 📅 Timeline Estimate (MVP)

| Phase | Focus | Est. Time | Status |
|-------|-------|-----------|--------|
| **5. Chat UI** | Frontend Implementation | 3-4 Days | 🚀 Ready |
| **6. Discovery** | ACS Scoring Logic | 2 Days | 🔴 Next |
| **7. Fabricator** | Skill Generation | 3-4 Days | 🟠 Planned |

## 🚀 Immediate Next Steps
1. **Frontend**: Start implementing `prototype_skill_factory.html` in Next.js.
2. **Backend**: Implement the ACS Scoring Agent (Phase 6).
