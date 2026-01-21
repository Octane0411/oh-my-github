# Proposal 011: GitHub to Skills Pivot

- **Status**: Draft
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

#### Agent Compatibility Score (ACS) 维度定义：

1.  **Interface Clarity (接口清晰度)**
    *   是否有 CLI？(CLI 是 Agent 最容易调用的接口)
    *   是否有简单的 Python API？
    *   *权重: High*

2.  **Documentation Quality (文档可读性 - for AI)**
    *   README 是否包含 "Usage" 或 "Example" 章节？(Agent 需要模仿 Usage 来生成指令)
    *   是否有清晰的参数说明？
    *   *权重: High*

3.  **Environment Friendliness (环境友好度)**
    *   依赖是否简单？(纯 Python/Node 最佳)
    *   是否需要复杂的系统级依赖 (如 CUDA, GUI)？(Agent 环境通常是 Headless 的)
    *   是否有 Dockerfile？
    *   *权重: Medium*

4.  **Token Economy (Token 经济性)**
    *   核心逻辑文件大小是否适中？(太大的库 Agent 难以完全理解)
    *   输出日志是否简洁？
    *   *权重: Low*

### 3. Generation Pipeline (Agent Synthesizer) - NEW
*   **核心引擎**: 集成 Claude 官方的 "Skill-Creator Skill" (Meta-Skill)。
*   **输入**: 仓库 README, 核心代码片段, 依赖文件。
*   **输出**: 
    *   `SKILL.md`: 包含 YAML frontmatter 和 Prompt 指令。
    *   `scripts/`: 必要的适配脚本。
    *   `requirements.txt`: 经过精简的依赖列表。

## User Experience (UX)
1.  用户输入: "我需要一个能下载 YouTube 视频的工具"
2.  Agent (Scout): 搜索并计算 ACS，推荐 `yt-dlp` (ACS: 95/100, 强 CLI 支持, 文档清晰)。
3.  用户: "好的，把它变成 Skill。"
4.  Agent (Synthesizer): 调用 Meta-Skill，生成 `yt-dlp-skill.zip`。
5.  用户: 下载并解压使用。

## Next Steps
1.  设计 ACS 的具体评分算法（Prompt-based Evaluation）。
2.  获取并研究 Claude 官方 Skill-Creator Skill 的工作原理。
