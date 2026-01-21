# Proposal 011: GitHub to Skills Pivot

- **Status**: Approved (MVP Scope Defined)
- **Date**: 2026-01-21
- **Priority**: Critical

## Context
基于对 Claude Agent Skills 架构的深入理解，以及 GitHub 作为代码宝库的潜力，我们决定将项目重心从“代码阅读辅助”转向“Agent 能力生成”。我们将利用 Claude 官方的 Skill 生成能力（Meta-Skill）来加速这一过程。

## Goals
1.  **P0**: 重构评分系统，建立 **Agent Compatibility Score (ACS)**，专门识别适合封装为 Skill 的仓库。
2.  **P1**: 实现 Skill 生成管线（Pipeline），集成 Meta-Skill 逻辑，输出符合 Anthropic 标准的 Skill 包。
3.  **P2**: 建立 Skill 展示页。

## Technical Changes

### Architecture: Supervisor + Sub-Graphs
采用 **Tool-Calling Integration** 模式：
*   **Outer Layer (Consultant)**: 使用 Vercel AI SDK 实现的 Supervisor Agent，负责对话管理和工具调用。
*   **Inner Layer (Pipelines)**: 使用 LangGraph 封装的确定性任务流水线，作为 Tool 暴露给 Supervisor。

### 1. Search Pipeline (Agent Scout)
*   **调整**: 搜索策略从“找代码学习”转向“找工具使用”。
*   **特征识别**: 优先检索含有 CLI 入口 (`argparse`, `click`)、清晰依赖 (`requirements.txt`) 和容器化支持 (`Dockerfile`) 的项目。
*   **封装**: 封装为 `findRepository` Tool。

### 2. Analysis Pipeline (Agent Screener) - 重构核心
废弃原有的多维评分系统，引入 **Agent Compatibility Score (ACS)**。
*   **Spec**: 详见 `docs/specs/acs-scoring-system.md`。
*   **实现**: 作为 Discovery Pipeline 中的一个 Node。

### 3. Generation Pipeline (Agent Synthesizer) - NEW
*   **核心引擎**: 集成 Claude 官方的 "Skill-Creator Skill" (Meta-Skill)。
*   **输入**: 仓库 README, 核心代码片段, 依赖文件。
*   **输出**: 
    *   `SKILL.md`: 包含 YAML frontmatter 和 Prompt 指令。
    *   `scripts/`: 必要的适配脚本。
    *   `requirements.txt`: 经过精简的依赖列表。
*   **封装**: 封装为 `generateSkill` Tool。

## User Experience (UX)
*   **Spec**: `docs/specs/ui-skill-factory.md` (Revised)
*   **Flow**:
    1.  **Consultation (Phase 1)**: 
        *   用户输入模糊需求。
        *   **Consultant Agent** 进行多轮对话，澄清具体场景（如：输入格式、输出要求、语言偏好）。
        *   确认需求锁定（Intent Locked）。
    2.  **Discovery (Phase 2)**: 
        *   **Scout Agent** 根据明确的需求搜索 GitHub。
        *   展示带有 ACS 评分的仓库卡片。
    3.  **Negotiation**: 
        *   用户确认是否使用该仓库，或要求重新搜索。
    4.  **Shortcut: Direct Fabrication**:
        *   如果用户直接提供 URL，跳过 Phase 1 & 2，直接进入 Phase 4。
    5.  **Fabrication (Phase 3)**: 
        *   **Fabricator Agent** 生成 Skill。
        *   展示生成过程日志（Terminal 风格）。
    6.  **Delivery**: 提供 Zip 下载。

## Next Steps
1.  **Backend**: 实现 Consultant Agent (Supervisor) 和 Discovery Pipeline (LangGraph Tool)。
2.  **Frontend**: 基于新的 UI Spec 实现 Next.js 页面，重点实现 `ConversationBlock` 和状态流转。
3.  **Integration**: 等待 Claude 官方 Skill-Creator 详细信息，集成到 Synthesizer。
