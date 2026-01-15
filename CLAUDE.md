<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

# Git Workflow

**IMPORTANT: Do NOT commit directly to the `dev` branch.**

## Branch Strategy

- **`dev`**: Development main branch (protected)
- **Feature branches**: `feat/<feature-name>` for new features
- **Other branches**: `fix/<bug-name>`, `docs/<doc-name>`, etc.

## Development Workflow

1. **Always work on feature branches**, never directly on `dev`
2. **Branch naming**:
   - New features: `feat/<feature-name>`
   - Bug fixes: `fix/<bug-name>`
   - Documentation: `docs/<topic-name>`
   - Refactoring: `refactor/<scope>`

3. **Commit workflow**:
   - Make commits to the feature branch
   - Keep commits focused and atomic
   - Use conventional commit messages

4. **Integration**:
   - Push feature branch to origin
   - User will create PR and merge on GitHub
   - Do NOT merge branches locally

## Rules for AI Assistants

- ✅ **DO**: Work on feature branches (`feat/*`, `fix/*`, etc.)
- ✅ **DO**: Commit to feature branches
- ✅ **DO**: Push feature branches to origin when ready
- ❌ **DON'T**: Commit directly to `dev` branch
- ❌ **DON'T**: Merge branches (user handles merges via GitHub PR)
- ❌ **DON'T**: Switch to `dev` unless explicitly instructed

**Before committing, always verify you're on the correct feature branch:**
```bash
git branch --show-current
```