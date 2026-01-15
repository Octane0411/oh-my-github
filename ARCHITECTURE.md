# 🏗️ Oh-My-GitHub Architecture Evolution

> **核心理念**: 从 Sequential Pipeline 演进到 Multi-Mode Autonomous System

这个文档记录了 oh-my-github 的架构演进路径，帮助理解当前设计决策和未来扩展方向。

---

## 📐 架构演进时间线

### Horizon 1: Sequential Pipeline (当前 - Proposal 4-7)

**架构模式**: Fixed Pipeline

```
用户输入 → Query Translator → Scout → Screener → Auditor → 报告
```

**特征**:
- 固定流程，无分支
- 每个 Agent 职责单一
- 适合明确的分析任务

**技术栈**:
- LangGraph.js (状态管理)
- DeepSeek V3 (LLM)
- GitHub API (数据源)

**代码结构**:
```
lib/agents/
  h1-pipeline/
    workflow.ts           # LangGraph 状态机
    query-translator/     # Agent 1: 意图识别
    scout/                # Agent 2: 海选
    screener/             # Agent 3: 初筛
    auditor/              # Agent 4: 深度分析
```

**验收标准**:
- ✅ 用户输入自然语言 → 自动找到并分析 Top 10 项目
- ✅ 生成详细的 Markdown 研报

---

### Horizon 2: Supervisor + Tools (Proposal 8+)

**架构模式**: Supervisor Pattern

```
用户输入 → [Supervisor Agent]
              ├→ analyze_project (H1 Pipeline as Tool)
              ├→ search_code (新能力: 代码搜索)
              ├→ answer_question (新能力: 技术问答)
              └→ compare_projects (新能力: 对比分析)
```

**关键变化**:
- **H1 Pipeline 封装成 Tool**: 一个可被调用的函数
- **Supervisor 决策**: LLM 根据用户意图选择调用哪个 Tool
- **支持多种任务**: 不再局限于项目分析

**实现方式**:

#### 1. 封装 H1 为 Tool
```typescript
// lib/agents/h1-pipeline/index.ts
export async function analyzeProject(params: {
  query: string;
  divergenceLevel: 'low' | 'medium' | 'high';
}): Promise<AnalysisReport> {
  const workflow = createH1Workflow();
  return await workflow.invoke(params);
}

// H2 时作为 Tool 使用
const analyzeProjectTool = {
  name: "analyze_project",
  description: "深度分析 GitHub 项目，返回 Top 10 项目的详细报告",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "自然语言查询" },
      divergenceLevel: { type: "string", enum: ["low", "medium", "high"] }
    }
  },
  execute: analyzeProject  // ← 直接复用 H1
};
```

#### 2. Supervisor Agent
```typescript
// lib/agents/h2-supervisor/supervisor.ts
const supervisorAgent = async (state: SupervisorState) => {
  const prompt = `
  你是一个任务协调者。根据用户输入决定调用哪个工具。

  用户输入: "${state.userInput}"

  可用工具:
  1. analyze_project - 找项目、分析项目、生成报告
  2. search_code - 搜索代码实现、查看函数定义
  3. answer_question - 回答技术问题、解释概念
  4. compare_projects - 对比多个项目的优缺点

  返回 JSON:
  {
    "tool": "工具名称",
    "reason": "选择理由",
    "params": { 工具参数 }
  }
  `;

  const decision = await llm.invoke(prompt);
  return decision;
};

// LangGraph Workflow
const h2Workflow = new StateGraph()
  .addNode("supervisor", supervisorAgent)
  .addNode("analyze_project", analyzeProjectTool.execute)
  .addNode("search_code", searchCodeTool.execute)
  .addNode("answer_question", answerQuestionTool.execute)
  .addConditionalEdges(
    "supervisor",
    (state) => state.tool,
    {
      "analyze_project": "analyze_project",
      "search_code": "search_code",
      "answer_question": "answer_question",
      "FINISH": END
    }
  );
```

**代码结构**:
```
lib/agents/
  h1-pipeline/            # 保持不变
    index.ts              # ← 暴露 analyzeProject 函数

  h2-supervisor/          # 新增
    workflow.ts           # Supervisor 状态机
    supervisor.ts         # Supervisor Agent
    tools/
      h1-tool.ts          # 封装 H1 Pipeline
      code-search-tool.ts # 代码搜索能力
      qa-tool.ts          # 问答能力
```

**验收标准**:
- ✅ 用户输入任意问题，Supervisor 自动选择合适的工具
- ✅ H1 的分析能力无损集成

---

### Horizon 3: Hierarchical Planning (Proposal 12+)

**架构模式**: Planner-Actor-Critic (PAC Loop)

```
用户任务 → [Meta Planner]
              ↓
          分解子任务
              ↓
          [Actor] 执行每个子任务
              ├→ 可能调用 H1 (分析项目)
              ├→ 可能调用 H2 (搜索代码)
              └→ 可能调用新能力 (Clone, 提 Issue)
              ↓
          [Critic] 验证结果
              ↓
          (如果失败) 重新规划
```

**新增能力**:
- **Clone & Run**: 在沙箱中运行项目
- **Issue Creator**: 自动提 Issue/PR
- **Interactive Tools**: Star, Watch, Fork

**适用场景**:
- "帮我提一个 Issue 指出文档链接失效"
- "找一个 React 动画库，Clone 下来跑一下 Demo"
- "复现这个 Bug 并尝试修复"

**代码结构**:
```
lib/agents/
  h3-execution/
    planner.ts            # 分解任务
    actor.ts              # 执行任务
    critic.ts             # 验证结果
    tools/
      h1-tool.ts          # 复用 H1
      h2-tool.ts          # 复用 H2
      sandbox-tool.ts     # 沙箱执行
      github-write-tool.ts # GitHub 写操作
```

---

### Horizon 4: Autonomous Swarm (长期愿景)

**架构模式**: Event-Driven Autonomous Agents

```
定时/事件触发 → [Watcher Agent]
                  ↓
              监测到变化
                  ↓
              [Decision Agent]
                  ↓
              调用 H1/H2/H3 能力
                  ↓
              主动推送给用户
```

**新增能力**:
- **Long-term Memory**: 记住用户偏好和历史
- **Cron Jobs**: 定时任务（每周趋势报告）
- **Event Triggers**: 监控 GitHub 事件（新 Release, Star 突增）

**适用场景**:
- "每周五给我一份 AI 领域的趋势报告"
- "盯着 Next.js 的 Release，一旦支持 React 19 就通知我"
- "帮我维护这个项目，自动合并 Dependabot 的 PR"

---

## 🔑 关键设计原则

### 1. **向后兼容**
- H2 不会破坏 H1 的代码
- H1 只需要暴露一个函数接口即可被封装成 Tool

### 2. **逐步演进**
- 不在 H1 阶段过度设计
- 但预留扩展接口（如 `analyzeProject` 函数）

### 3. **能力复用**
- 每个 Horizon 都可以复用之前的能力
- H3 可以调用 H1 和 H2 的所有功能

### 4. **清晰的职责边界**
```
H1: 我知道怎么分析项目 (Read-Only)
H2: 我知道怎么回答问题 (Read-Only + RAG)
H3: 我知道怎么执行操作 (Write Access)
H4: 我知道怎么自主工作 (Autonomous)
```

---

## 📊 架构对比表

| 特征 | H1 | H2 | H3 | H4 |
|------|----|----|----|----|
| **架构模式** | Pipeline | Supervisor + Tools | PAC Loop | Event-Driven |
| **决策方式** | 固定流程 | LLM 选择 Tool | 动态规划 | 自主触发 |
| **H1 角色** | 主体 | Tool | 能力之一 | 底层能力 |
| **并行能力** | 部分并行 | 无需并行 | 任务级并行 | 多实例并行 |
| **用户交互** | 单次请求 | 多轮对话 | 任务委托 | 主动推送 |
| **成本** | 低 | 中 | 中高 | 高 |

---

## 🛠️ 技术栈演进

### Horizon 1
- **状态管理**: LangGraph.js
- **LLM**: DeepSeek V3
- **数据源**: GitHub REST API
- **前端**: Next.js 15 (App Router)

### Horizon 2
- **新增**: Tool Calling 机制
- **新增**: Embedding + Vector DB (代码搜索)
- **新增**: RAG Pipeline (文档问答)

### Horizon 3
- **新增**: Cloud Sandbox (Docker/Firecracker)
- **新增**: GitHub App (OAuth + Write Permissions)
- **新增**: Task Queue (BullMQ/Inngest)

### Horizon 4
- **新增**: Long-term Memory (Redis/Postgres)
- **新增**: Cron System (Trigger.dev)
- **新增**: Notification Service (Webhooks/Email)

---

## 📝 迁移指南

### 从 H1 到 H2

**步骤 1**: 暴露 H1 函数
```typescript
// lib/agents/h1-pipeline/index.ts
export async function analyzeProject(params) {
  // 现有逻辑
}
```

**步骤 2**: 创建 Tool 封装
```typescript
// lib/agents/h2-supervisor/tools/h1-tool.ts
import { analyzeProject } from '@/lib/agents/h1-pipeline';

export const analyzeProjectTool = {
  name: "analyze_project",
  execute: analyzeProject
};
```

**步骤 3**: 创建 Supervisor
```typescript
// lib/agents/h2-supervisor/workflow.ts
// 见上文实现
```

**步骤 4**: 更新 API Route
```typescript
// app/api/analyze/route.ts
import { createH2Workflow } from '@/lib/agents/h2-supervisor/workflow';

export async function POST(req: Request) {
  const workflow = createH2Workflow();
  return workflow.invoke({ userInput: ... });
}
```

---

## 🧪 测试策略

### H1 测试
- **单元测试**: 每个 Agent 独立测试
- **集成测试**: Pipeline 端到端测试

### H2 测试
- **Tool 测试**: 确保 H1 封装正确
- **Supervisor 测试**: 验证 LLM 决策准确性
- **E2E 测试**: 多种用户意图覆盖

### H3 测试
- **Sandbox 测试**: 安全性和隔离性
- **GitHub API 测试**: Mock 写操作
- **Rollback 测试**: 失败回滚机制

---

## 🎯 Proposal 4-7 最终决策 (2026-01-15)

> **详细决策文档**: 参见 `/PROPOSAL_4_DECISIONS.md`

### 核心架构决策

#### 1. Pipeline 内部并行架构

**数据流**:
```
用户输入 → Query Translator → Scout (3策略并行) → Screener (两阶段)
                                                       ↓
                                                  返回 Top 10 列表
                                                       ↓
用户点击 → Auditor + OSS Insight API → 详细报告 + K线图
```

**关键特性**:
- ✅ 按需加载（Auditor 仅在用户点击时执行）
- ✅ 多点并行（Scout 3策略、Screener 25个LLM）
- ✅ 用户等待时间：8-10秒（列表）+ 5-7秒（详情）
- ✅ 成本：~$0.02（列表）+ $0.005（单个详情）

---

#### 2. Screener 两阶段筛选策略

**问题**: 基于规则的打分不够准确，纯LLM成本太高

**解决方案**: 混合策略
- **阶段1**: 规则粗筛（50-100个 → 25个）
  - 基于Stars、更新时间、License等快速过滤
- **阶段2**: LLM精筛（25个 → 10个）
  - LLM评估相关性、文档质量、易用性
  - 并行执行，3-5秒完成

**优势**: 成本最优（~$0.02）、速度快、准确度高

---

#### 3. 多维度评分体系

**6个核心维度**:
1. Maturity (成熟度) - 元数据计算
2. Activity (活跃度) - 元数据计算
3. Documentation (文档质量) - LLM评估
4. Community (社区健康度) - 元数据计算
5. Ease of Use (易用性) - LLM评估
6. Maintenance (维护状态) - GitHub API

**展示**: 雷达图 + 综合评分 + 详细说明

---

#### 4. Star History 策略 ✅

**MVP阶段（Proposal 4-7）**:
- 使用 GitHub API 采样（Stargazers列表）
- 计算近期增长率（内部使用）
- **不在列表页展示**（保持简洁）

**详情页（Proposal 7+）**:
- 集成 OSS Insight API
- 显示完整 K线图 + 增长分析
- 缓存24小时

**不包含**: Trending数据（价值有限）

---

### API 设计

- **`/api/search`**: 搜索 + 筛选 → Top 10列表
- **`/api/analyze-repo`**: 单个项目深度分析
- **`/api/search/more`**: 查看更多候选

---

### 技术栈

- **状态管理**: LangGraph.js
- **LLM**: DeepSeek V3
- **数据源**: GitHub REST API + OSS Insight API
- **图表**: Recharts (雷达图、K线图)

---

## 📚 参考资料

### 架构模式
- [LangGraph Multi-Agent Systems](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/)
- [ReAct Pattern](https://arxiv.org/abs/2210.03629)
- [Hierarchical Planning](https://arxiv.org/abs/2305.04091)

### 工具实现
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [LangChain Tools](https://js.langchain.com/docs/modules/agents/tools/)

### 案例参考
- [AutoGPT Architecture](https://github.com/Significant-Gravitas/AutoGPT)
- [Crew AI Design](https://github.com/joaomdmoura/crewAI)
- [Microsoft AutoGen](https://github.com/microsoft/autogen)

---

**最后更新**: 2026-01-15
**维护者**: Claude Code + @Octane0411
