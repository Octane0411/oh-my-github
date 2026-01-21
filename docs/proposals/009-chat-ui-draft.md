# Proposal 9: Upgrade to Chat UI

**Status**: Draft
**Priority**: P0 (Critical)
**Timeline**: 3-4 Days

## 1. Overview

This proposal aims to implement the complete conversational user interface for oh-my-github, replacing the current simple search interface with a Perplexity-style streaming chat experience. This UI will directly consume the Agent Coordinator API (`/api/chat`) implemented in Phase 4.

## 2. Core Features

### 2.1 Streaming Chat Container
- **ChatHistory**: Vertical list displaying the conversation flow.
- **MessageBubble**: Distinct styles for User (right aligned, blue accent) and Assistant (left aligned, neutral).
- **ThinkingLogs**: Real-time visualization of the agent's thought process (e.g., "Searching GitHub...", "Analyzing results...").
  - Style: Monospace font, green terminal-like accent, collapsible.
- **InputArea**: Sticky bottom input with auto-expanding textarea and send button.

### 2.2 Structured Result Display
The UI must render structured data returned by the agent, not just text.
- **RepoCard**: High-density card for individual repositories.
  - Header: Owner/Name, Stars, Language.
  - Body: Description, Topics.
  - Footer: Last updated, License, "Deep Dive" button.
- **RepoList**: Grid or list view for search results.
- **ComparisonTable**: Horizontal scrolling table for comparing multiple repos.
  - Columns: Features, Stars, Activity, License, Bundle Size, etc.
- **AnswerSummary**: Markdown-rendered summary text provided by the agent.

### 2.3 State Management (Zustand)
- **Store**: `useChatStore`
- **State**:
  - `conversations`: Array of conversation summaries.
  - `currentConversationId`: ID of active chat.
  - `messages`: Array of messages for current chat.
  - `isLoading`: Boolean.
  - `streamingContent`: Temporary buffer for incoming stream.
- **Persistence**: `localStorage` for saving chat history (limit 10 conversations).

### 2.4 Theme System
- **Library**: `next-themes`
- **Themes**: Light / Dark (GitHub Primer colors).
- **Toggle**: Header button to switch themes.
- **Default**: System preference.

### 2.5 Vercel AI SDK Integration
- **Hook**: `useChat` (or custom implementation if `useChat` doesn't support our custom SSE format well).
- **Stream Parsing**: Handle custom event types (`log`, `text`, `data`, `done`, `error`).

## 3. Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Markdown**: `react-markdown` + `rehype-highlight`
- **Charts**: `recharts` (for future analytics)

## 4. Implementation Plan

### Day 1: Foundation & State
- [ ] Setup `next-themes` and Tailwind config (GitHub Primer colors).
- [ ] Implement `useChatStore` with Zustand.
- [ ] Create basic layout (Sidebar + Main Chat Area).
- [ ] Implement `ChatInput` component.

### Day 2: Streaming & Messages
- [ ] Implement SSE client / `useChat` integration.
- [ ] Create `MessageBubble` component.
- [ ] Implement `ThinkingLogs` component (collapsible).
- [ ] Handle streaming updates (text deltas + logs).

### Day 3: Structured Components
- [ ] Create `RepoCard` component.
- [ ] Create `RepoList` grid layout.
- [ ] Create `ComparisonTable` component.
- [ ] Integrate Markdown rendering for summaries.

### Day 4: Polish & Refinement
- [ ] Add animations (Framer Motion or CSS transitions).
- [ ] Responsive design adjustments (Mobile view).
- [ ] Error handling and empty states.
- [ ] Final testing with backend API.

## 5. Design Reference

- **Typography**: Inter (UI), SF Mono (Code/Logs).
- **Colors (GitHub Light Mode - Default)**:
  - **Background**: `#ffffff` (Main), `#f6f8fa` (Sidebar/Muted).
  - **Text**: `#1f2328` (Primary), `#636c76` (Secondary).
  - **Border**: `#d0d7de`.
  - **Accent**: `#0969da` (Blue), `#1a7f37` (Green).
  - **Card**: White bg with `#d0d7de` border and subtle shadow.
- **Spacing**: Comfortable density (similar to GitHub).
- **Motion**: Subtle fade-ins for messages, smooth expansion for logs.
