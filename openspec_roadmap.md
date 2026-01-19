# OpenSpec Roadmap (Revised for Vision 3.0)

> oh-my-github 项目的渐进式开发路线图（2026-01-18 更新）
> **战略重心**: 从 "VC Analyst" 转向 **"Open Source Decision Engine"** (Vision 3.0)

## 开发原则

**核心策略**: **Agent First, UI Second**
- **P0**: 先实现 Agent 化后端（多轮对话、上下文理解），再一次性实现前端。
- **理由**: 避免前端多次重构，直接构建最终形态的对话式 UI。
- **UI**: 拥抱 **Perplexity 风格流式对话**，一次性实现完整交互体验。
- **MVP**: 用户输入自然语言 → Agent 理解并执行 → 实时流式展示结果 → 支持追问和深度分析。

---

## 📋 Proposal 清单

### 阶段 1: 核心能力验证 (PoC Phase) ✅ 已完成

*(已归档，详见历史记录)*

---

### 阶段 2: Web 基础架构搭建 (Foundation Phase) ✅ 已完成

*(已归档，详见历史记录)*
- **状态**: ✅ **已完成** (v0.1.0)
- **部署**: https://oh-my-github-nine.vercel.app

---

### 阶段 3: 智能搜索核心 (Smart Search Phase) ✅ 已完成

**目标**: 实现 Vision 3.0 的核心——"Better GitHub Search"。
让用户通过自然语言找到高质量项目。

#### ✅ Proposal 4-6: `add-search-pipeline` (合并方案) - **已完成**
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现 "Hunter" 场景（模糊搜索 -> 精准推荐）
- **架构实现**:
  - ✅ **Query Translator**: LLM 驱动的语义理解和关键词扩展
  - ✅ **Scout**: 3策略并行搜索（Stars/Recency/Expanded Keywords）
  - ✅ **Screener**: 两阶段筛选（粗筛 + LLM 精细评分）
  - ✅ **Multi-Dimensional Scoring**: 7 维度评分系统
    - Maturity, Activity, Community, Maintenance (基于元数据)
    - Documentation, Ease of Use, Relevance (基于 LLM)
- **已交付**:
  - ✅ API: `/api/search` (完整错误处理和超时控制)
  - ✅ LangGraph 工作流 (Query Translator → Scout → Screener)
  - ✅ 性能优化: LRU 缓存 (30,000x 加速)
  - ✅ 生产就绪: 结构化日志和可观测性
  - ✅ 完整测试套件 (集成、性能、成本验证)
- **性能指标**:
  - 搜索时间: 30-45s (未缓存), <10ms (缓存命中)
  - 成本: $0.005-0.010 per search
  - 相关性: 95%+ (balanced 模式)
- **归档日期**: 2026-01-18
- **状态**: ✅ **已完成并归档** (archived as `2026-01-18-add-search-pipeline`)

---

### 阶段 4: Agent 化与多轮对话 (Agent Framework Phase) 🚀 优先

**目标**: 将当前的搜索 workflow 升级为真正的 Agent 系统，支持多轮对话、上下文理解和复杂交互。

#### 🆕 Proposal 8: `add-agent-coordinator` (Agent 化核心)
- **优先级**: 🔴 P0 (必选，**优先实现**）
- **目标**: 重构后端为 Agent 架构，支持多轮对话和智能路由。
- **核心改造**:
  
  **1. 会话管理系统**
  - 实现 `Conversation` 和 `Message` 数据模型
  - 支持会话 ID 和历史消息管理
  - 上下文传递：理解"第一个项目"、"前三名"等指代
  - 会话持久化（Redis/内存）
  
  **2. Agent Coordinator（协调者）**
  - **意图识别**: 判断用户请求类型
    - `SearchIntent`: 搜索仓库
    - `AnalyzeIntent`: 深度分析特定项目
    - `CompareIntent`: 对比多个项目
    - `FollowUpIntent`: 追问和澄清
    - `ClarifyIntent`: 意图模糊时的反问
  - **路由决策**: 根据意图调用不同的 Agent
  - **Synthesizer (合成器)**: 统一所有 Agent 的输出，保证格式一致性和 UI 组件数据的类型安全
  
  **3. 流式响应协议（SSE）**
  - `/api/chat` 新端点（替代 `/api/search`）
  - 支持实时日志流式输出
  - 返回结构化消息（JSON Lines 格式）
  - **严格类型定义**: 使用 Union Types 定义 `structuredData`，杜绝 `any`
  
  **4. Agent 增强能力**
  - **Query Translator 升级**: 理解上下文（"再找一个类似的"）
  - **Scout 增强**: 支持根据历史结果调整搜索策略
  - **Context Compression**: 大文件读取时的自动摘要机制

- **API 示例**:
  ```typescript
  POST /api/chat
  {
    "conversationId": "conv_123",
    "message": "我想找 React 状态管理库",
    "history": [
      { role: "user", content: "..." },
      { role: "assistant", content: "..." }
    ]
  }
  
  // 流式响应（SSE）
  data: {"type":"log","content":"理解您的需求：寻找 React 状态管理解决方案"}
  
  data: {"type":"log","content":"搜索 GitHub API..."}
  
  data: {"type":"log","content":"找到 24 个候选项，正在评分..."}
  
  data: {"type":"summary","content":"基于社区活跃度和易用性，推荐 **Zustand**..."}
  
  data: {"type":"result","data":{"name":"pmndrs/zustand","stars":45200,...}}
  
  data: {"type":"done","stats":{"totalCandidates":24,"queryTime":8450}}
  ```

- **技术栈**:
  - **Agent 框架**: LangGraph (已使用) 或 LangChain
  - **上下文管理**: 内存 ConversationBufferMemory（简单场景）或 Redis（持久化）
  - **流式响应**: Server-Sent Events (SSE)
  - **意图识别**: 使用 LLM（gpt-4o-mini）进行轻量级意图分类

- **依赖**: Phase 3 已完成的搜索 pipeline
- **预计时间**: 4-5 天
- **状态**: 📝 待开始

---

### 阶段 5: 流式对话 UI (Chat UI Phase) 🎨 一次性实现

**目标**: 一次性实现完整的沉浸式对话界面，直接对接 Agent 化后端。

#### 🆕 Proposal 9: `upgrade-to-chat-ui` (流式对话 UI)
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现完整的流式对话界面，**无需后续重构**。
- **核心特性**:
  
  **1. 流式对话容器**
  - `ChatHistory`: 展示对话历史（用户消息 + AI 响应）
  - `MessageBubble`: 消息气泡组件（区分用户/AI）
  - `ThinkingLogs`: 实时 Agent 思考日志（Monospace 字体 + 绿色主题）
  - `NewChatButton`: 开始新对话按钮
  
  **2. 结构化结果展示**
  - `SearchContainer`: 极简搜索框（Idle State → Sticky Header）
  - `RepoCard`: 高密度信息卡片（图标、Stars、License、AI Insight）
  - `ComparisonTable`: 横向滚动对比表格（GitHub 风格）
  - `AnswerSummary`: AI 推荐总结（Markdown 格式）
  
  **3. 状态管理（Zustand）**
  - 对话历史管理：
    ```typescript
    interface ChatStore {
      conversations: Conversation[];
      currentConversationId: string | null;
      addMessage: (message: Message) => void;
      startNewConversation: () => void;
    }
    ```
  - localStorage 持久化（最多 10 个会话，每个 20 条消息）
  - 支持会话切换和删除
  
  **4. 主题系统**
  - GitHub Primer 双主题（Light/Dark Mode）
  - 默认白天模式，支持系统偏好检测
  - 使用 `next-themes` 库（自动处理 SSR 闪烁）
  - 主题切换按钮（Sun/Moon 图标）
  
  **5. 流式集成（Vercel AI SDK）**
  - 使用 `useChat` hook 对接 `/api/chat`
  - 自动解析 JSON Lines 流式消息
  - 打字机效果和渐进式渲染
  - 错误处理和降级方案

- **交互流程**:
  ```
  1. Idle State: 极简搜索框居中 + Logo + Suggestion Pills
     ↓ 用户输入查询
  2. Thinking State: 搜索框上移 + ThinkingLogs 流式展示
     ↓ Agent 处理中（实时日志）
  3. Result State: 顶部搜索框 + 结构化结果卡片
     ↓ 用户点击追问输入框
  4. Multi-turn: 展示对话历史 + 继续对话
  ```

- **设计系统**:
  - **配色**: GitHub Primer（白天 + 黑夜双主题）
  - **字体**: Inter（正文）+ SF Mono（代码/日志）
  - **动画**: 纯 CSS Transitions（搜索框上移 0.7s, 卡片淡入 0.5s）
  - **响应式**: 移动端单栏布局，横向滚动表格

- **技术栈**:
  - **前端框架**: React (Next.js 15) + TypeScript
  - **状态管理**: Zustand + localStorage 持久化
  - **流式集成**: Vercel AI SDK (`ai` package)
  - **主题系统**: next-themes
  - **UI 组件**: Shadcn/ui + Tailwind CSS
  - **图标**: lucide-react
  - **Markdown**: react-markdown（可选）

- **依赖**: Proposal 8（Agent 化后端）完成
- **预计时间**: 3-4 天
- **状态**: 📝 待开始

---

### 阶段 6: 深度分析与增强 (Deep Insight Phase) 📊 可选优化

**目标**: 实现按需深度分析和体验增强。

#### 🆕 Proposal 10: `add-auditor-agent` (深度分析)
- **优先级**: 🟠 P1 (核心增强)
- **目标**: 实现 "Researcher" 场景（深度体检）。
- **触发方式**:
  - 对话中输入："帮我深度分析 Zustand"
  - 或点击 RepoCard 的 "Deep Dive" 按钮
- **生成内容**:
  - 深度研报（架构分析、代码质量、测试覆盖率）
  - Star History 趋势图（使用 Chart.js/Recharts）
  - 贡献者分析（活跃度、Bus Factor）
  - 风险评估（依赖健康度、License 兼容性）
- **展示方式**: Modal 或全屏页面
- **依赖**: Proposal 8, 9 完成
- **预计时间**: 2-3 天
- **状态**: 📝 待开始

---

## 📅 调整后的时间线

| 阶段 | Proposal | 重点 | 预计时间 | 状态 |
|------|----------|------|---------|------|
| **3. Search Core** | 4-6 | 搜索准确度、召回率 | 3-4 天 | ✅ **已完成** |
| **4. Agent Framework** | 8 | Agent 协调、多轮对话、流式响应 | 4-5 天 | 📝 待开始 ← **优先** |
| **5. Chat UI** | 9 | 流式对话界面、主题系统、状态管理 | 3-4 天 | 📝 待开始 |
| **6. Deep Insight** | 10 | 深度分析、数据可视化 | 2-3 天 | 📝 可选 |

**总计**: 9-12 天（不含 Proposal 10）

**进度**: 
- ✅ 阶段 3 完成（搜索核心）
- 🚀 **当前焦点**: Proposal 8（Agent 化后端）← **优先开始**
- 🎯 **短期目标** (MVP): 完成 Proposal 8-9，实现完整的流式对话系统（预计 7-9 天）
- 📊 **中期目标**: 完成 Proposal 10，增强深度分析能力（预计额外 2-3 天）

---

## 🚀 下一步行动

**当前焦点**: Proposal 8 - `add-agent-coordinator` (Agent 化核心)

**执行指令**:
```bash
# 1. 创建 Proposal 8 的设计文档
openspec proposal add-agent-coordinator

# 2. 核心改造内容
# - 会话管理：实现 Conversation 和 Message 模型
# - Agent Coordinator：意图识别、路由决策、上下文管理
# - 流式响应：/api/chat 端点，SSE 协议
# - Agent 增强：Query Translator/Scout/Screener 支持上下文

# 3. 技术选型
# - Agent 框架：LangGraph (已使用)
# - 上下文管理：ConversationBufferMemory
# - 流式协议：Server-Sent Events (SSE)
# - 意图识别：gpt-4o-mini
```

**已完成里程碑**:
- ✅ Milestone 1: 核心能力验证 (PoC)
- ✅ Milestone 2: Web 基础架构
- ✅ **Milestone 3: 智能搜索核心** ← 当前完成
- 🚀 Milestone 4: Agent 化与多轮对话 ← **下一步（优先）**
- 🎨 Milestone 5: 流式对话 UI
- 📊 Milestone 6: 深度分析增强（可选）

---

## 🎯 战略调整说明

### 为什么改为"后端优先"？

**原方案问题**（分 3 阶段）:
1. UI 需要多次重构（基础卡片 → 流式 → 多轮对话）
2. 架构不一致，技术债累积
3. 开发时间分散，难以集中精力

**新方案优势**（后端优先）:
1. ✅ **前端只改一次**：直接实现最终形态的对话 UI
2. ✅ **架构清晰**：Agent 化是核心能力，先做好基础
3. ✅ **避免重复劳动**：一次性实现，无需后续大规模重构
4. ✅ **符合长期规划**："后续一定会是多轮对话" → 直接构建多轮对话系统

### 核心理念

**Agent First, UI Second**
- 先构建强大的 Agent 能力（理解、推理、执行）
- 再用优秀的 UI 将能力展现给用户
- 前端是后端能力的"窗口"，而非驱动力

---

## 📚 参考资源

- **Agent 框架**: [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- **流式响应**: [Vercel AI SDK](https://sdk.vercel.ai/docs)
- **主题系统**: [next-themes](https://github.com/pacocoursey/next-themes)
- **设计系统**: [GitHub Primer](https://primer.style/)
- **UI 原型**: `ui_prototypes.md` (方案 A: 沉浸式流式风格)
