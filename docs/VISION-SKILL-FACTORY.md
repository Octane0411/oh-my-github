# Vision: GitHub to Skills Factory (Oh-My-GitHub 3.0)

## 1. Core Philosophy (核心理念)

**"GitHub is the world's largest library of potential Agent Skills."**

目前，GitHub 上的海量工具（CLI 工具、Python 脚本、API 封装）主要服务于开发者。我们的目标是打破这一壁垒，通过 **Oh-My-GitHub** 将这些代码资产“封装”为 **Agent Skills**，让 Claude 等 AI Agent 能够直接理解、调用和执行这些工具。

我们不再仅仅是一个“代码搜索工具”，我们是 **Agent 能力的制造工厂**。

---

## 2. Product Definition (产品定义)

**Oh-My-GitHub** 是一个智能化的 Agent Skill 生成平台。它通过对话引导用户发现需求，在 GitHub 上寻找最佳匹配的开源项目，并自动将其转化为标准化的 Agent Skill 包。

### The Workflow (核心流程)

1.  **Intent (意图)**: 用户提出需求（例如：“我想分析一下这个 PDF 的表格”）。
2.  **Discovery (发现 - P0)**: 系统在 GitHub 上检索最合适的工具（例如：`pdfplumber` 或 `tabula-py`）。
3.  **Analysis & Negotiation (分析与交互)**: 
    *   Agent 阅读仓库文档，理解如何使用。
    *   Agent 与用户对话确认：“我找到了 `pdfplumber`，它适合提取文本，是否将其转化为 Skill？”
4.  **Fabrication (制造 - P1)**: 
    *   **Meta-Skill Engine**: 利用 Claude 官方的 "Skill-Creator Skill"（或其他元能力），读取仓库的 README 和代码结构。
    *   **Auto-Generation**: 自动生成 `SKILL.md`（包含精准的 Prompt 指令）和必要的 Wrapper 脚本。
    *   **Packaging**: 打包为标准格式，准备交付。
5.  **Delivery (交付)**: 用户下载 Skill 包（Zip），解压即可被 Claude Desktop 或 Claude Code 使用。

---

## 3. Roadmap & Phasing (分阶段规划)

### Phase 0: Intelligent Discovery (智能发现)
*目标：找到最适合转化为 Skill 的 GitHub 项目。*
*   **核心能力**: 
    *   基于场景的语义搜索（不仅搜代码，更搜“用法”）。
    *   **Agent Compatibility Score (ACS)**: 全新的评分体系，取代传统的代码质量评分。专注于评估一个仓库是否容易被 Agent 理解和执行。
    *   **交互**: 聊天界面，用户描述任务，我们推荐仓库。

### Phase 1: The Skill Fabricator (技能制造机 - MVP)
*目标：生成标准化的 Skill 文件结构。*
*   **核心能力**:
    *   **Meta-Skill Integration**: 集成官方的 Skill 生成能力，作为核心转换引擎。
    *   **Instruction Synthesis**: 从 README 的 Usage 章节提取并合成 Agent 指令。
    *   **Artifact Export**: 提供 `.zip` 下载。
*   **交付物**: 用户获得一个压缩包，解压到 `.claude/skills` 即可使用。

### Phase 2: The Skill Store (预制技能库)
*目标：DeepWiki 模式，所见即所得。*
*   **核心能力**:
    *   **Pre-built Skills**: 针对热门领域（PDF处理、数据分析、视频下载）预先生成高质量 Skill。
    *   **Skill Preview**: 在网页上直接查看 Skill 的能力描述和指令预览。
    *   **Community**: 用户分享自己生成的 Skills。

---

## 4. Architecture Alignment (架构对齐)

现有的架构将重新聚焦于 Skill 生成：

*   **Agent Scout (侦察兵)**: 负责 P0。寻找 GitHub 仓库，侧重于寻找 `setup.py`, `requirements.txt`, `cli.py` 等特征。
*   **Agent Screener (筛选器)**: 负责 P0。应用 **Agent Compatibility Score (ACS)** 进行筛选。
*   **Agent Synthesizer (合成器)**: 负责 P1。调用 Meta-Skill 逻辑，生成最终的 `SKILL.md`。
*   **Frontend**: 变为 Skill 的配置和下载中心。

---

## 5. Why This Wins? (为什么这能成？)

1.  **解决了“空壳”问题**: Claude 很强，但没有工具（Tools）它无法与物理世界交互。
2.  **解决了“配置”难题**: 手写 `SKILL.md` 和调试环境很麻烦，我们自动化这个过程。
3.  **利用了长尾效应**: 官方 Skill 只有几个（PDF, Excel），但 GitHub 上有无限的长尾工具（比如：视频下载、特定格式转换、学术论文抓取）。
