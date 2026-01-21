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

### 1. Search Pipeline (Agent Scout)
*   **调整**: 搜索策略从“找代码学习”转向“找工具使用”。
*   **特征识别**: 优先检索含有 CLI 入口 (`argparse`, `click`)、清晰依赖 (`requirements.txt`) 和容器化支持 (`Dockerfile`) 的项目。

### 2. Analysis Pipeline (Agent Screener) - 重构核心
废弃原有的多维评分系统，引入 **Agent Compatibility Score (ACS)**。
*   **Spec**: 详见 `docs/specs/acs-scoring-system.md`。

### 3. Generation Pipeline (Agent Synthesizer) - NEW
*   **核心引擎**: 集成 Claude 官方的 "Skill-Creator Skill" (Meta-Skill)。
*   **输入**: 仓库 README, 核心代码片段, 依赖文件。
*   **输出**: 
    *   `SKILL.md`: 包含 YAML frontmatter 和 Prompt 指令。
    *   `scripts/`: 必要的适配脚本。
    *   `requirements.txt`: 经过精简的依赖列表。

## User Experience (UX)
*   **Prototype**: `prototype_skill_factory.html` (已确认)
*   **Flow**:
    1.  **Discovery**: 用户输入需求，系统展示带有 ACS 评分的仓库卡片。
    2.  **Negotiation**: 用户确认转换。
    3.  **Fabrication**: 系统展示生成过程日志（Terminal 风格）。
    4.  **Delivery**: 提供 Zip 下载。

## Next Steps
1.  **Frontend**: 基于原型实现 Next.js 页面。
2.  **Backend**: 实现 ACS 评分 Agent。
3.  **Integration**: 等待 Claude 官方 Skill-Creator 详细信息，集成到 Synthesizer。
