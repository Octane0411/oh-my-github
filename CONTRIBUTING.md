# Contributing to oh-my-github

Thank you for your interest in contributing to **oh-my-github**! We welcome contributions from the community.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Workflow](#workflow)
- [Code Standards](#code-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Need Help?](#need-help)

---

## Getting Started

Before you begin:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/oh-my-github.git
   cd oh-my-github
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Octane0411/oh-my-github.git
   ```

---

## Development Setup

### Prerequisites

- **Node.js**: v18+ or **Bun** (recommended)
- **GitHub Personal Access Token**: Required for GitHub API access
  - Create at: https://github.com/settings/tokens
  - Scopes: `public_repo` (or `repo` for private repos)
- **DeepSeek V3 API Key**: Required for LLM analysis
  - Get from: https://platform.deepseek.com/

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   # or: npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your credentials:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   DEEPSEEK_V3_API_KEY=sk_your_key_here
   ```

3. **Run the development server**:
   ```bash
   bun run dev
   # or: npm run dev
   ```

4. **Open your browser**: Visit http://localhost:3000

### Build and Test

- **Development server**: `bun run dev`
- **Production build**: `bun run build`
- **Start production server**: `bun run start`
- **Lint code**: `bun run lint`

---

## Workflow

We use **GitHub Flow** for development:

### 1. Create a Feature Branch

Always branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

**Branch naming conventions**:
- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/topic` - Documentation updates
- `chore/task` - Maintenance tasks
- `refactor/scope` - Code refactoring

### 2. Make Your Changes

- Write clear, concise code
- Follow existing code style
- Add comments where necessary
- Keep commits focused and atomic

### 3. Commit Your Work

Use conventional commit messages (see [Commit Guidelines](#commit-guidelines)):

```bash
git add .
git commit -m "feat: add repository search functionality"
```

### 4. Push to Your Fork

```bash
git push origin feat/your-feature-name
```

### 5. Create a Pull Request

1. Go to the [original repository](https://github.com/Octane0411/oh-my-github)
2. Click **"New Pull Request"**
3. Select your fork and branch
4. Fill in the PR template with:
   - **Description**: What does this PR do?
   - **Related Issue**: Link to any related issues
   - **Testing**: How did you test this?
   - **Screenshots**: If UI changes, include before/after

### 6. Code Review

- Address review feedback promptly
- Make changes in your branch and push again
- PR will auto-update

### 7. Merge

Once approved:
- Maintainers will merge your PR
- Your branch will be deleted automatically
- Celebrate! 🎉

---

## Code Standards

### TypeScript

- Use **TypeScript** for all code
- Enable strict mode
- Define types for all function parameters and return values
- Avoid `any` types unless absolutely necessary

### Formatting

- Use **Prettier** for code formatting (auto-format on save recommended)
- Indentation: 2 spaces
- Line length: 100 characters (soft limit)
- Use single quotes for strings

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: Match component name (`Button.tsx`) or use kebab-case (`api-client.ts`)

### React/Next.js Best Practices

- Use **functional components** with hooks
- Keep components small and focused
- Use **Server Components** by default (Next.js 15)
- Only use `'use client'` when necessary (state, effects, browser APIs)
- Prefer **composition** over inheritance

### File Organization

```
app/
  ├── api/              # API routes
  ├── page.tsx          # Pages
  └── layout.tsx        # Layouts
components/
  └── ui/               # Shadcn/ui components
lib/
  ├── github/           # GitHub API client
  ├── analysis/         # LLM analysis logic
  └── utils/            # Utility functions
```

---

## Commit Guidelines

We follow **Conventional Commits**:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)

### Examples

```bash
# Good commits
feat: add repository search functionality
fix: resolve API timeout issue in analysis route
docs: update README with deployment instructions
refactor: simplify GitHub API client error handling

# Bad commits (avoid)
update stuff
fixes
WIP
asdfgh
```

### Scope (Optional)

Add scope for clarity:

```bash
feat(api): add caching layer to /api/analyze
fix(ui): correct button alignment in AnalysisForm
docs(readme): add troubleshooting section
```

---

## Pull Request Process

### Before Submitting

- [ ] Code builds without errors (`bun run build`)
- [ ] No TypeScript errors
- [ ] Code follows project style guidelines
- [ ] Commits follow conventional commit format
- [ ] Branch is up to date with `main`

### PR Title

Use the same format as commit messages:

```
feat: add user authentication system
fix: resolve memory leak in data fetching
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Related Issue
Fixes #123 (if applicable)

## Changes Made
- Added X feature
- Fixed Y bug
- Refactored Z component

## Testing
- [ ] Tested locally
- [ ] Tested production build
- [ ] Verified on multiple browsers (if UI change)

## Screenshots (if applicable)
Before: [image]
After: [image]
```

### Review Process

1. **Automated checks**: All CI checks must pass
2. **Code review**: At least one maintainer approval required
3. **Testing**: Reviewer may test changes locally
4. **Merge**: Maintainer will merge using "Squash and merge"

---

## Project Structure

### Key Directories

- **`app/`**: Next.js App Router pages and API routes
- **`components/`**: Reusable React components
- **`lib/`**: Core business logic
  - `github/`: GitHub API integration
  - `analysis/`: LLM analysis pipeline
  - `utils/`: Helper functions
- **`public/`**: Static assets
- **`openspec/`**: Project specifications and proposals

### Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: Shadcn/ui
- **LLM**: DeepSeek V3
- **Deployment**: Vercel
- **Package Manager**: Bun (or npm)

---

## Need Help?

- **Questions**: Open a [GitHub Discussion](https://github.com/Octane0411/oh-my-github/discussions)
- **Bug Reports**: Create an [Issue](https://github.com/Octane0411/oh-my-github/issues)
- **Feature Requests**: Open an [Issue](https://github.com/Octane0411/oh-my-github/issues) with label `enhancement`

---

## Code of Conduct

Be respectful and constructive. We aim to foster an inclusive and welcoming community.

- Be kind and patient
- Respect differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the project

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (check LICENSE file).

---

Thank you for contributing to **oh-my-github**! 🚀
