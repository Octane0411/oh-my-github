# OpenSpec Roadmap (Revised for Vision 3.0)

> oh-my-github 项目的渐进式开发路线图（2026-01-18 更新）
> **战略重心**: 从 "VC Analyst" 转向 **"Open Source Decision Engine"** (Vision 3.0)

## 开发原则

**核心策略**: **Search First, Insight Second**
- **P0**: 解决 "找不到" 和 "看不懂" 的问题（智能搜索 + 结构化展示）。
- **UI**: 拥抱 **Adaptive Stream** (流式卡片)，放弃复杂的双面板仪表盘。
- **MVP**: 用户输入自然语言 -> 10秒内得到高质量、结构化的项目推荐列表。

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

### 阶段 4: 深度情报与展示 (Insight & UI Phase)

**目标**: 实现 Vision 3.0 的交互范式——"Chat First, Cards for Content"。

#### 🆕 Proposal 8: `upgrade-to-stream-ui` (重构)
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现流式卡片 UI，替代原计划的双面板布局。
- **设计变更**:
  - **Layout**: 默认单栏居中（类似 Perplexity/Google）。
  - **Components**:
    - `ChatStream`: 流式对话容器。
    - `RepoCard`: 高密度信息卡片（核心交付物）。
    - `ComparisonTable`: 自动对比表格（当结果 > 1 时）。
  - **Interaction**: 点击卡片 -> 侧边抽屉 (Drawer) 展示详情，不跳转页面。
- **状态**: 📝 待开始

#### 🆕 Proposal 7: `add-auditor-agent` (深度分析)
- **优先级**: 🟠 P1 (核心)
- **目标**: 实现 "Researcher" 场景（深度体检）。
- **调整**:
  - 作为 "On-Demand" (按需) 能力。只有用户点击卡片详情时才触发。
  - 生成深度研报、Star History 趋势图、代码质量分析。
- **状态**: 📝 待开始

---

### 阶段 5: 实时体验优化 (Real-time UX Phase)

#### ✅ Proposal 9: `add-streaming-integration`
- **优先级**: 🔴 P0 (必选)
- **目标**: 前后端流式协议打通。
- **内容**:
  - Vercel AI SDK 集成。
  - 实时展示 Agent 思考过程 ("正在搜索 GitHub...", "正在分析 Readme...")。
  - 提升用户感知的响应速度。
- **状态**: 📝 待开始

---

## 📅 调整后的时间线

| 阶段 | Proposal | 重点 | 预计时间 | 状态 |
|------|----------|------|---------|------|
| **3. Search Core** | 4-6 | 搜索准确度、召回率 | 3-4 天 | ✅ **已完成** (实际: 3天) |
| **4. Stream UI** | 8 | 卡片设计、流式交互 | 2-3 天 | 📝 待开始 |
| **5. Deep Insight** | 7 | 深度研报、数据可视化 | 2-3 天 | 📝 待开始 |
| **6. Integration** | 9 | 流式体验优化 | 1-2 天 | 📝 待开始 |

**进度**: 阶段 3 完成，剩余 **5-8 天** 可完成 Vision 3.0 的核心 MVP。

---

## 🚀 下一步行动

**当前焦点**: Proposal 8 - `upgrade-to-stream-ui` (流式卡片 UI)

✅ **阶段 3 已完成**: 搜索逻辑（"大脑"）已构建完成并投入生产。

**下一步**: 构建"脸面"（UI），让用户能够直观地看到和使用搜索结果。

**执行指令**:
```bash
# 1. 创建 Proposal 8 的设计文档
openspec proposal upgrade-to-stream-ui

# 2. 设计流式卡片组件
# - ChatStream: 流式对话容器
# - RepoCard: 高密度信息卡片
# - ComparisonTable: 自动对比表格

# 3. 集成 /api/search 端点到前端
```

**已完成里程碑**:
- ✅ Milestone 1: 核心能力验证 (PoC)
- ✅ Milestone 2: Web 基础架构
- ✅ **Milestone 3: 智能搜索核心** ← 当前完成
- 📝 Milestone 4: 流式 UI 体验 ← 下一步
