# UI Specification & Prototype

> 本文档记录 oh-my-github 的 UI 设计规范、Prompt 以及 v0.dev 生成的组件代码链接。

## 1. Design System
- **Theme**: Dark Mode (Default)
- **Style**: GitHub-inspired (Primer CSS aesthetic)
- **Font**: System UI (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`)
- **Colors**:
  - Background: `#0d1117` (GitHub Dark Dimmed)
  - Primary: `#238636` (GitHub Green)
  - Border: `#30363d`

## 2. Page: Landing Page
- **Goal**: 极简入口，引导用户开始对话。
- **v0 Prompt**:
  > Design a minimal, dark-themed landing page for 'oh-my-github'.
  > **Centerpiece**: A large, glowing chat input field in the middle of the screen.
  > **Placeholder**: 'Find me a Rust-based AI agent framework with good docs...'
  > **Vibe**: Cyberpunk meets clean SaaS. No clutter. Just the input and some subtle background particles.
- **v0 Link**: [待补充]
- **Key Components**: `HeroInput`, `FeatureCards`

## 3. Page: Workspace (Main Layout)
- **Goal**: 核心工作台，左侧对话，右侧展示内容。
- **v0 Prompt**:
  > A split-screen workspace layout.
  > **Left Panel (30%)**: A chat interface (The Copilot). Shows conversation history. Agent messages show 'Thinking...' steps.
  > **Right Panel (70%)**: The Canvas / Content Area. Initially shows a grid of 'Trending Alphas'. Updates dynamically based on chat context.
- **v0 Link**: [待补充]
- **Key Components**: `ResizableLayout`, `ChatSidebar`, `CanvasArea`

## 4. Component: Repo Card (List Item)
- **Goal**: 在列表中展示项目核心指标。
- **v0 Prompt**:
  > A repository card component.
  > **Content**: Repo Name, Description, Tech Stack tags.
  > **Visuals**: A small sparkline chart for Star growth.
  > **Badges**: 'Alpha Score: 85', 'Good First Issue: 5'.
  > **Action**: 'Deep Dive' button triggers a side drawer.
- **v0 Link**: [待补充]

## 5. Component: Deep Dive Drawer
- **Goal**: 展示深度审计报告。
- **v0 Prompt**:
  > A side drawer (sheet) component for deep analysis.
  > **Header**: Repo stats + 'Alpha Score' gauge.
  > **Grid**: Radar chart (Code Quality), Heatmap (Activity), Terminal box (AI Insight).
  > **Action**: 'View on GitHub' button.
- **v0 Link**: [待补充]