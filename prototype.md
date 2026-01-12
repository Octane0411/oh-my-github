# oh-my-github
> **The VC Analyst for Open Source Code**
> 开源代码界的“风投分析师” —— 你的开源项目价值发现引擎。

## 1. 核心理念 (Core Concept)
GitHub 上的项目浩如烟海，对于**开源贡献小白**来说，找到一个合适的切入点非常困难。传统的搜索容易让你迷失在 Star 数高但难以合入代码的“明星项目”，或者无人维护的“僵尸项目”中。

**oh-my-github** 是你的**开源贡献向导 (Contribution Guide)**。它结合了 VC 般的价值发现能力与贴心的贡献可行性分析，帮你找到那些**符合兴趣、足够活跃、且容易合入 PR** 的优质项目。

## 2. 核心价值 (Value Proposition)
- **寻找 Alpha (潜力股)**：发现那些 Star 数适中 (<1k~5k) 但增长势头猛的早期项目，伴随项目一起成长。
- **贡献友好度分析 (Contribution Friendly)**：
  - 识别 `good first issue` 的数量与质量。
  - 分析 PR 合并速度与 Maintainer 的交互态度。
- **深度审计**: 不只看表面数据，深入代码库分析架构、测试覆盖率，确保你贡献的是高质量代码。
- **节省时间**: 从“海量浏览”转变为“精准匹配”。

## 3. Agent 工作流 (The Funnel Workflow)
我们将采用 **LangGraph** 编排一个三层漏斗模型：

### Phase 1: Sourcing (海选 - 基于偏好)
- **目标**：根据用户的**自定义偏好**广撒网。
- **输入参数**：
  - **关键词**: e.g., "AI Agent", "RAG", "MCP"
  - **技术栈**: e.g., "Python", "Next.js", "Rust"
  - **Star 范围**: e.g., 100 - 5000 (避免太冷门或太热门)
- **动作**：调用 GitHub Search API 获取候选列表。

### Phase 2: Screening (初筛 - 活跃度与机会)
- **目标**：快速过滤掉不适合贡献的项目。
- **指标**：
  - **活跃度**：最近 2 周是否有 Commit？Issue 响应时间是否 < 48h？
  - **贡献机会**：是否有未解决的 Issue？PR 合并率如何？
- *Output*: 10 个进入决赛圈的项目。

### Phase 3: Deep Dive (深度尽调) - *Core Agentic Capability*
- **目标**：模拟资深工程师进行代码审计，评估上手难度。
- **动作**：
  - **代码质量分析**：代码结构是否清晰？有没有 CI/CD？
  - **上手难度评估**：文档是否齐全（CONTRIBUTING.md）？本地运行是否容易？
  - **切入点推荐**：Agent 自动阅读 Issue 列表，推荐适合新手的具体 Issue。
- *Output*: 生成一份结构化的 **"Contribution Report" (贡献研报)**。

## 4. 技术架构 (Tech Stack)
采用 **"Hybrid Architecture" (混合架构)**，兼顾开发体验与 AI 生态。

### Frontend (The Body)
- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun
- **AI SDK**: Vercel AI SDK (用于流式展示报告、UI 交互)
- **UI**: TailwindCSS + Shadcn/ui + Recharts (雷达图展示)

### Backend (The Brain)
- **Framework**: FastAPI (Python)
- **Orchestration**: **LangGraph** (处理漏斗逻辑、状态管理)
- **Tools**:
  - GitHub API (PyGithub)
  - LLM (OpenAI/Anthropic)
  - Search Tools (Tavily/SerpAPI for 竞品分析)

## 5. MVP 功能规划
1.  **Dashboard**: 展示“今日推荐”的 3 个潜力项目。
2.  **Search**: 用户输入关键词（如 "RAG Framework"），触发 Agent 实时调研。
3.  **Report**: 包含“推荐理由”、“风险提示”、“适合贡献的切入点”的详细报告卡片。

## 6. UI/UX Design Prompts
详细的 UI 设计规范、Prompt 及 v0 组件链接请参考：[UI Specification](./ui_spec.md)