# Spec: Agent Compatibility Score (ACS) System

## Overview
**Agent Compatibility Score (ACS)** 是 Oh-My-GitHub 3.0 的核心筛选指标。它用于评估一个 GitHub 仓库是否适合被封装为 **Agent Skill**。与传统的代码质量评分（如 Code Climate）不同，ACS 关注的是“机器可读性”和“自动化执行的难易程度”。

## Scoring Dimensions (总分 100)

### 1. Interface Clarity (接口清晰度) - 30 Points
*Agent 能够多容易地调用这个工具？*

| Criteria | Score | Description |
| :--- | :--- | :--- |
| **CLI Support** | 15 | 项目提供开箱即用的 CLI (e.g., `python -m tool`, `bin/tool`)。这是 Agent 最喜欢的交互方式。 |
| **Simple API** | 10 | 提供简单的函数式入口 (e.g., `process(input) -> output`)，而非复杂的类继承体系。 |
| **Arguments** | 5 | 参数定义清晰，支持标准参数解析库 (`argparse`, `click`, `fire`, `typer`)。 |

### 2. Documentation Quality (文档可读性) - 30 Points
*Agent 能够多容易地学会使用这个工具？*

| Criteria | Score | Description |
| :--- | :--- | :--- |
| **Usage Section** | 15 | README 包含明确的 `## Usage` 或 `## Quickstart` 章节。 |
| **Code Examples** | 10 | 提供可复制粘贴的代码示例（Agent 会模仿这些示例来生成 Skill 指令）。 |
| **Input/Output** | 5 | 明确说明了输入格式（如文件路径）和输出格式（如 JSON, CSV）。 |

### 3. Environment Friendliness (环境友好度) - 20 Points
*Agent 能够多容易地安装和运行这个工具？*

| Criteria | Score | Description |
| :--- | :--- | :--- |
| **Standard Deps** | 10 | 依赖管理标准 (`requirements.txt`, `pyproject.toml`, `package.json`) 且依赖树较浅。 |
| **Pure Code** | 5 | 纯 Python/Node 实现，无复杂的 C 扩展或系统级依赖 (如 `ffmpeg`, `imagemagick` 需额外扣分或特殊处理)。 |
| **Containerization**| 5 | 提供 `Dockerfile`，意味着环境可复现。 |

### 4. Token Economy (Token 经济性) - 20 Points
*运行这个工具是否昂贵？*

| Criteria | Score | Description |
| :--- | :--- | :--- |
| **Concise Logs** | 10 | 工具输出简洁的文本/JSON，而非大量冗余日志（节省 Context Window）。 |
| **Code Size** | 10 | 核心逻辑代码量适中，Agent 可以在上下文中阅读源码进行 Debug。 |

---

## Implementation Logic

ACS 的计算将通过 **LLM Evaluation** 实现。

### Input
*   `README.md` content
*   `requirements.txt` / `package.json` content
*   File tree structure (depth=2)
*   `--help` output (if detectable)

### Evaluation Prompt Template

```markdown
You are the "Agent Compatibility Auditor". Your job is to evaluate a GitHub repository for its suitability to be converted into an AI Agent Skill.

Analyze the provided repository context based on the following 4 dimensions. 
For each criterion, assign a score and provide a brief reason.

Context:
[README Content]
[File Structure]
[Dependency File]

Output Format (JSON):
{
  "interface_clarity": {
    "score": 0-30,
    "reason": "...",
    "has_cli": boolean
  },
  "documentation_quality": {
    "score": 0-30,
    "reason": "...",
    "has_usage_examples": boolean
  },
  "environment_friendliness": {
    "score": 0-20,
    "reason": "...",
    "complexity": "low" | "medium" | "high"
  },
  "token_economy": {
    "score": 0-20,
    "reason": "..."
  },
  "total_score": 0-100,
  "recommendation": "HIGHLY_RECOMMENDED" | "POSSIBLE" | "NOT_RECOMMENDED",
  "skill_generation_strategy": "CLI_WRAPPER" | "PYTHON_SCRIPT" | "API_CALL"
}
```

## Thresholds
*   **> 80**: **Excellent**. 直接生成 Skill。
*   **60 - 79**: **Good**. 需要生成 Wrapper 脚本来简化接口。
*   **< 60**: **Poor**. 不建议自动转换，需要人工介入。
