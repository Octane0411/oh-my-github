# oh-my-github 技术架构方案 (Draft)

> 基于 LangGraph 的多智能体开源项目价值发现系统

## 1. 核心架构模式：LangGraph State Machine

采用 **分治法 (Divide and Conquer)**，将系统设计为一个 **StateGraph（状态图）**。每个节点（Node）是一个专注于特定任务的 Agent 或 Tool。

### 全局状态 (Global State)
```python
class AgentState(TypedDict):
    user_query: str          # 原始输入
    search_params: dict      # 转化后的 GitHub 搜索参数
    candidates: List[Repo]   # 候选仓库列表 (海选结果)
    shortlist: List[Repo]    # 初筛后的列表 (包含基础指标)
    final_reports: List[Report] # 最终的深度研报
    current_step: str        # 当前处于哪个阶段
```

## 2. Agent/节点 拆解

系统逻辑拆解为 4 个核心节点：

### 2.1. Query Translator (意图理解与参数转化)
*   **角色**：投资经理助理
*   **输入**：用户自然语言 + **发散程度参数 (Creativity Level)**
*   **策略**：**用户可控的适度发散 (Controlled Expansion)**
    *   利用 LLM 进行适度联想（例如搜 "Agent" 时联想 "Autonomous", "Orchestration"）。
    *   前端提供 UI (如滑块) 让用户控制发散程度：
        *   *Low*: 精准匹配。
        *   *Medium (Default)*: 包含同义词和强相关术语。
        *   *High*: 探索性搜索，包含跨领域相关项目。
*   **输出示例**：
    *   Keywords: `RAG framework` OR `Retrieval Augmented Generation`
    *   Language: `Python`
    *   Stars: `100..5000`
    *   Created: `>2023-01-01`

### 2.2. The Scout (海选 - Sourcing)
*   **角色**：数据采集员
*   **任务**：调用 GitHub Search API 获取 Top 50-100 结果。
*   **逻辑**：执行搜索 -> 去重 (Archived/Fork) -> 清洗。
*   **特点**：主要依赖 API 调用，无需重度 LLM 参与。

### 2.3. The Screener (初筛 - Screening)
*   **角色**：量化分析师
*   **任务**：基于多维度指标计算综合得分，将 100 个候选缩减至 10 个。
*   **策略**：**综合打分机制 (Weighted Scoring System)**
    *   **活跃度 (Activity, 40%)**: Commit 频率、Issue 响应速度。
    *   **门槛 (Accessibility, 30%)**: 是否有 `good first issue`、`CONTRIBUTING.md`、文档完整度。
    *   **规模 (Size, 30%)**: Star 数是否在理想区间 (避免过热或过冷)。
*   **技术实现**：并发调用 GitHub API 获取详情，Python 脚本计算加权总分，取 Top 10。

### 2.4. The Auditor (深度尽调 - Deep Dive)
*   **角色**：资深技术专家 (CTO)
*   **任务**：对最终 3-5 个项目进行深度扫描。
*   **策略**：**实战导向 (Action-Oriented)**
    *   **上手实操 (Onboarding, 45%)**: 重点分析 `CONTRIBUTING.md`、环境搭建步骤、依赖复杂度，生成“避坑指南”。
    *   **任务推荐 (Task Recommendation, 45%)**: 扫描 Issue 列表，结合代码结构，推荐 3 个具体切入点并给出思路。
    *   **代码审计 (Code Quality, 10%)**: 仅简要检查测试覆盖率和核心架构模式，不进行深度静态分析。
*   **动作序列**：
    1.  **读取文档**：`README.md`, `CONTRIBUTING.md`
    2.  **代码嗅探**：分析文件树 (File Tree)，判断架构 (tests, docs, src)
    3.  **依赖分析**：检查 `requirements.txt`/`package.json`
    4.  **Issue 分析**：抽取最近 Closed PR，分析 Maintainer 态度 (Sentiment Analysis)
*   **输出**：结构化 Markdown 研报。

## 3. 技术选型

### Backend (The Brain)
*   **框架**: Next.js API Routes (TypeScript)
*   **Runtime**: **Edge Runtime**
    *   *理由*: 绕过 Vercel Serverless 的 10s 超时限制，支持长连接流式输出。
*   **编排**: **LangGraph.js**
    *   *理由*: 与 Python 版功能对齐，且能与 Next.js 无缝集成，实现全栈 TypeScript。
*   **LLM Provider**: **OpenRouter** (聚合 API)
    *   *理由*: 统一接口，灵活切换模型，无最低充值门槛。
*   **Model Strategy (混合模型)**:
    *   **主力模型**: **DeepSeek V3** (用于意图识别、初筛、简单分析) - *高性价比*
    *   **专家模型**: **Claude 3.5 Sonnet** (用于深度代码审计) - *最强代码能力*
*   **辅助模型**: gpt-4o-mini (备用)

### Data (The Eyes)
*   **Source**: GitHub API (Octokit SDK)
    *   **Auth**: **Personal Access Token (PAT)** (MVP 阶段)
*   **Cache**: Vercel KV / Upstash Redis (Serverless 友好)

### Storage (The Memory)
*   **MVP Phase**: **Ephemeral (临时会话)**
    *   不依赖数据库，数据仅存在于内存/浏览器 LocalStorage。
    *   *目标*: 快速验证核心价值，降低部署成本。
*   **Phase 2**: **Persistent Archive (永久归档)**
    *   引入 Supabase/PostgreSQL。
    *   *功能*: 支持历史研报回溯、生成分享链接、构建“社区精选”榜单。

### Frontend (The Face)
*   **Stack**: Next.js + Vercel AI SDK
*   **交互**: **透明化进度展示 (Transparent Progress)**
    *   采用 **进度条 + 步骤日志 (Progress Bar + Logs)** 模式。
    *   实时展示 Agent 的思考过程和执行动作 (e.g., "正在读取 README...", "正在分析 Issue #42...", "正在生成报告...")。
    *   增强用户的掌控感和信任感 (极客风格)。

### Infrastructure (Deployment)
*   **Platform**: **Vercel (All-in-One)**
    *   *策略*: 前后端同构，利用 Vercel 的 Edge Network 进行全球分发。
    *   *成本*: MVP 阶段 $0 (Hobby Plan)。
    *   *未来演进*: 若计算密集型任务增加，Phase 2 可考虑拆分 Python 微服务 (FastAPI) 部署至 Railway/AWS。

## 4. 潜在挑战与应对

1.  **Serverless Timeout (超时限制)**
    *   *风险*: Vercel Serverless Function 有执行时长限制。
    *   *策略*: **流式响应 (Streaming Response)**。利用 Vercel AI SDK 的流式传输机制，只要保持数据传输，通常可规避硬性超时。
2.  **Context Window (上下文窗口)**
    *   *策略*: **RAG / Smart Context**。只喂文件树和核心文件，不喂全量代码。
3.  **Latency (延迟)**
    *   *策略*: **并行执行 (Parallel Execution)**。在“深度尽调”阶段，利用 LangGraph 的 Map-Reduce 模式并行分析多个仓库。

## 5. 开发路径建议

1.  **Step 1**: 封装 GitHub Search Tool (TypeScript/Octokit)。
2.  **Step 2**: 定义 LangGraph.js State 和 Nodes，串联“搜索 -> 过滤 -> 分析”流程。
3.  **Step 3**: 接入 LLM，调优“深度分析” Prompt。