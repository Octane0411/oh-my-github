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

We use **GitHub Flow** for development - a simple, branch-based workflow.

## Branch Strategy

- **`main`**: Main branch (default branch)
  - Always in a deployable state
  - All production deployments come from this branch
  - Code merged only through Pull Requests
  - Protected: no direct pushes allowed
  - Important releases are tagged (e.g., `v0.1.0`, `v1.0.0`)

- **Feature branches**: Created from `main`, naming conventions:
  - `feat/<feature-name>` - New features
  - `fix/<bug-name>` - Bug fixes
  - `docs/<topic>` - Documentation updates
  - `chore/<task>` - Maintenance tasks
  - `refactor/<scope>` - Code refactoring

## Development Workflow

1. **Create branch from main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/my-feature
   ```

2. **Develop and commit**:
   - Make changes in the feature branch
   - Keep commits focused and atomic
   - Use conventional commit messages

3. **Push to remote**:
   ```bash
   git push origin feat/my-feature
   ```

4. **Create Pull Request**:
   - Open PR on GitHub targeting `main`
   - Add description and context
   - (Optional) Request code review

5. **Merge**:
   - Merge PR on GitHub (squash or merge commit)
   - Delete feature branch after merge

6. **Clean up local branch**:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feat/my-feature
   ```

## Release Process

When releasing a new version:

1. Ensure `main` is stable and tested
2. Create and push an annotated tag:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0: Description"
   git push origin v1.0.0
   ```
3. Create a GitHub Release with changelog
4. Deploy from `main` branch

## Rules for AI Assistants

- ✅ **DO**: Work on feature branches (`feat/*`, `fix/*`, `docs/*`, etc.)
- ✅ **DO**: Commit to feature branches
- ✅ **DO**: Push feature branches to origin when ready
- ✅ **DO**: Remind user to create Pull Request on GitHub
- ❌ **DON'T**: Push directly to `main` branch
- ❌ **DON'T**: Merge branches locally (user handles merges via GitHub PR)
- ❌ **DON'T**: Switch to `main` unless explicitly instructed

**Before committing, always verify you're on the correct feature branch:**
```bash
git branch --show-current
```

## Why GitHub Flow?

- **Simple**: Only one main branch, easy to understand
- **Fast**: Quick iterations, continuous deployment
- **Safe**: All changes reviewed via Pull Requests
- **Scalable**: Works for teams of all sizes
- **Industry standard**: Used by React, Next.js, and many open-source projects