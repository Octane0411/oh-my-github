# OpenSpec Roadmap (Revised)

> oh-my-github 项目的渐进式开发路线图（2026-01-14 更新）

## 开发原则

**核心策略**: 风险驱动 + 由内而外 (Inside-Out) + 快速迭代
- 先验证核心能力（数据 + AI），再搭建架构
- 先实现功能闭环（能用），再打磨体验（好用）
- **采用分阶段 UI 策略**：最小化验证 → 功能完整 → 体验优化
- 每个 Proposal 都是可独立验证的里程碑

---

## 📋 Proposal 清单

### 阶段 1: 核心能力验证 (PoC Phase) ✅ 已完成

**目标**: 确保技术栈可行性，降低风险

#### ✅ Proposal 1: `add-github-data-layer`
- **优先级**: 🔴 P0 (必选)
- **目标**: 验证 GitHub API 数据获取能力
- **输出**:
  - 可运行的测试脚本 `scripts/test-github.ts`
  - 确认能获取: stars, commits, issues, PR merge rate 等关键指标
- **涉及能力**:
  - `github-search` - 仓库搜索
  - `github-metadata` - 仓库详细信息获取
- **预计耗时**: 1-2 天
- **依赖**: 无
- **状态**: 📦 **已归档** (2026-01-13)

---

#### ✅ Proposal 2: `add-llm-analysis-pipeline`
- **优先级**: 🔴 P0 (必选)
- **目标**: 验证 LLM 分析能力和 Prompt 效果
- **输出**:
  - LLM 测试脚本，输出结构化 Markdown 研报
  - 调优后的 Prompt 模板
  - Token 成本评估 ($0.0008/次)
- **涉及能力**:
  - `llm-integration` - DeepSeek V3 接入
  - `report-generation` - 结构化研报生成
- **预计耗时**: 1-2 天
- **依赖**: 无
- **状态**: 📦 **已归档** (2026-01-13)

**🎯 Milestone 1: PoC 完成** ✅
- 验收标准: 能在终端看到 "输入仓库 → 获取数据 → LLM 分析 → 打印研报"

---

### 阶段 2: Web 基础架构搭建 (Foundation Phase)

**目标**: 建立 Web 应用最小可用版本，验证端到端流程

#### ✅ Proposal 3: `add-nextjs-foundation` (Minimal)
- **优先级**: 🔴 P0 (必选)
- **目标**: 搭建 Next.js 最小化基础架构，快速验证 Web 端流程
- **策略**: **采用 Option A（最小化方案）**
- **输出**:
  - 可运行的 Next.js 15 项目（App Router + TypeScript + Tailwind）
  - Shadcn/ui 核心组件（Button, Input, Card, Badge）
  - API Route: `/api/analyze` (集成现有 lib/ 代码)
  - 单页面应用: 输入框 + 按钮 + Markdown 报告展示
  - Vercel 部署成功
- **涉及能力**:
  - `frontend-ui` - 基础页面结构 (10 requirements)
  - `api-routes` - 后端接口 (10 requirements)
- **预计耗时**: 1-2 天 (~11 小时)
- **依赖**: Proposal 1, 2 ✅
- **状态**: ✅ **已完成** (2026-01-15)
  - 🌐 部署地址: https://oh-my-github-nine.vercel.app
  - 🏷️ 版本标签: v0.1.0
- **验收标准**:
  - ✅ 用户可访问 Web 界面
  - ✅ 输入 "facebook/react" 可获得完整分析报告
  - ✅ 部署到 Vercel 成功
  - ✅ 端到端流程验证通过

**🎯 Milestone 2: 最小 Web 版本上线** ✅ **已达成** (2026-01-15)
- 验收标准: 可公开访问的 Web 应用，能完整演示核心价值

---

### 阶段 3: Multi-Agent 系统实现 (Core Agent Phase)

**目标**: 实现四层漏斗模型 (Intent Understanding → Sourcing → Screening → Deep Dive)

> **注意**: 此阶段可在最小化 UI 上开发和测试，无需等待完整 UI

#### ✅ Proposal 4-6: `add-search-pipeline` (合并方案)
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现完整的搜索和筛选流程（Query Translator + Scout + Screener）
- **架构决策** (2026-01-15):
  - LangGraph Sequential Pipeline
  - 按需加载 Auditor（用户点击时触发）
  - 多点并行执行（Scout 3策略、Screener 25个LLM）
  - 两阶段筛选（规则粗筛 + LLM精筛）
- **输出**:
  - API: `/api/search` - 返回 Top 10 项目列表
  - 多维度评分体系（6个维度 + 雷达图）
  - 自然语言 → GitHub 搜索参数转化
  - 支持"发散程度"控制 (Low/Medium/High)
  - 多策略并行搜索（Stars、Updated、Expanded）
- **涉及能力**:
  - `agent-query-translator` - LLM驱动的意图识别
  - `agent-scout` - 多策略海选（3策略并行）
  - `agent-screener` - 两阶段筛选（规则 + LLM）
  - `multi-dimensional-scoring` - 6维度评分系统
- **技术栈**:
  - LangGraph.js (状态管理)
  - DeepSeek V3 (LLM)
  - GitHub REST API (数据源)
  - Recharts (雷达图)
- **预计耗时**: 3-4 天
- **成本**: ~$0.02/次查询
- **性能**: 8-10秒返回列表
- **依赖**: Proposal 3 ✅
- **状态**: 📝 未开始
- **详细决策**: 参见 `/PROPOSAL_4_DECISIONS.md`

---

#### ~~Proposal 5: `add-scout-agent`~~ (已合并到 Proposal 4-6)
- **状态**: ✅ **已合并到 Proposal 4-6**
- **理由**: Scout 与 Query Translator 和 Screener 形成完整的搜索 Pipeline，合并实现更高效
- **原目标**: 实现"海选"Agent，多策略并行搜索
- **新位置**: 在 Proposal 4-6 中作为第二个 Agent 实现

---

#### ~~Proposal 6: `add-screener-agent`~~ (已合并到 Proposal 4-6)
- **状态**: ✅ **已合并到 Proposal 4-6**
- **理由**: Screener 是搜索流程的关键环节，与 Scout 紧密耦合，合并实现避免接口反复调整
- **原目标**: 实现"初筛"Agent，两阶段筛选（规则 + LLM）
- **新位置**: 在 Proposal 4-6 中作为第三个 Agent 实现
- **增强**: 增加了多维度评分体系（6个维度 + 雷达图）

---

#### ✅ Proposal 7: `add-auditor-agent`
- **优先级**: 🟠 P1 (核心功能)
- **目标**: 实现"深度尽调"Agent (The Auditor)
- **架构决策** (2026-01-15):
  - **按需加载**: 仅在用户点击项目详情时触发
  - **独立 API**: `/api/analyze-repo` (与搜索流程解耦)
  - **集成 Star History**: 使用 OSS Insight API
- **输出**:
  - API: `/api/analyze-repo` - 单个项目深度分析
  - 代码库深度扫描 (README, CONTRIBUTING, 文件树, 依赖, Issues)
  - 生成结构化 Markdown 研报
  - **Star History 可视化**: K线图 + 增长趋势分析
  - 包含: 上手指南 + 任务推荐 + 避坑提示 + 项目生命周期判断
- **涉及能力**:
  - `agent-auditor` - 深度分析 Agent (LLM驱动)
  - `star-history-integration` - OSS Insight API 集成
  - `code-analysis` - 代码审计逻辑
  - `visualization` - K线图绘制 (Recharts)
- **技术栈**:
  - DeepSeek V3 (报告生成)
  - OSS Insight API (Star History 数据)
  - GitHub REST API (详细信息)
  - Recharts (K线图)
- **预计耗时**: 2-3 天
- **成本**: ~$0.005/次分析
- **性能**: 5-7秒返回详情
- **依赖**: Proposal 4-6 ✅
- **状态**: 📝 未开始
- **Star History 策略**:
  - MVP: GitHub API 采样（内部使用，不展示）
  - 详情页: OSS Insight API（完整K线图）
  - 不包含: Trending 数据

**🎯 Milestone 3: Multi-Agent 系统完成** (完成 Proposal 4-7 后达成)
- 验收标准:
  - ✅ 用户输入自然语言 → 8-10秒返回 Top 10 项目列表
  - ✅ 列表显示多维度评分（6维度 + 雷达图）
  - ✅ 用户点击项目 → 5-7秒显示详细分析 + Star History K线图
  - ✅ 按需加载，成本可控（~$0.02 列表 + $0.005 单个详情）
  - ✅ 完整的搜索到深度报告闭环

---

### 阶段 4: UI 体系完善 (UI Enhancement Phase)

**目标**: 为 Agent 进度可视化和流式输出构建完整的 UI 基础

> **关键节点**: 此阶段是 **UI 完整性确认点**，为后续 UX 优化提供结构支撑

#### 🆕 Proposal 8: `upgrade-to-complete-ui` (新增)
- **优先级**: 🔴 P0 (必选)
- **目标**: 升级到完整 UI 基础架构（原 Proposal 3 Option B）
- **策略**: **实现完整的双面板布局和组件体系**
- **输出**:
  - Landing Page (hero section + feature cards)
  - Workspace 页面（双面板布局）
  - 左侧 Chat Sidebar (30%) - 对话历史 + Agent 思考步骤
  - 右侧 Canvas Area (70%) - 动态内容展示区
  - 完整的 UI 组件库（RepoCard, ProgressIndicator 等）
  - 页面导航系统
- **涉及能力**:
  - `frontend-ui` - 扩展现有能力（新增 7 requirements）
    - Workspace 布局系统
    - ChatSidebar 组件
    - CanvasArea 组件
    - RepoCard 组件
    - 页面导航
- **预计耗时**: 2-3 天 (~10 小时，复用 Proposal 3 的基础）
- **依赖**: Proposal 7（Agent 系统完成后，UI 设计更有针对性）
- **状态**: 📝 未开始
- **验收标准**:
  - ✅ Landing page 和 Workspace 页面完整
  - ✅ 双面板布局可正常工作
  - ✅ 所有 UI 组件符合 ui_spec.md 规范
  - ✅ 为流式输出预留 UI 接口

**🎯 Milestone 4: UI 基础完整** (完成 Proposal 8 后达成)
- 验收标准: 完整的页面结构和组件体系，为实时进度展示做好准备

---

### 阶段 5: 实时体验优化 (Real-time UX Phase)

**目标**: 实现流式传输和透明化进度展示

#### ✅ Proposal 9: `add-streaming-ui` (原 Proposal 8)
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现流式传输，解决 Vercel 超时限制
- **输出**:
  - Edge Runtime + Vercel AI SDK 集成
  - 后端支持流式响应
  - 前端实时渲染 Agent 执行步骤（依赖 Proposal 8 的完整布局）
  - ChatSidebar 展示 Agent 思考过程
  - CanvasArea 动态更新分析结果
- **涉及能力**:
  - `streaming-api` - 流式 API
  - `progressive-rendering` - 渐进式 UI 更新
- **预计耗时**: 2-3 天
- **依赖**: Proposal 8（需要完整的 UI 布局来展示流式进度）
- **状态**: 📝 未开始

---

#### ✅ Proposal 10: `add-ui-polish` (原 Proposal 9)
- **优先级**: 🟢 P2 (可选)
- **目标**: 美化 UI，实现"透明化进度展示"
- **输出**:
  - GitHub 风格的暗色主题（可选）
  - 进度条 + 步骤日志（类似黑客控制台）
  - Recharts 雷达图展示项目评分
  - 动画和过渡效果
  - Sparkline 星标增长曲线
- **涉及能力**:
  - `ui-components` - 高级组件
  - `progress-visualization` - 可视化进度展示
- **预计耗时**: 2-3 天
- **依赖**: Proposal 9
- **状态**: 📝 未开始

**🎯 Milestone 5: MVP 完整上线** (完成 Proposal 9 后达成)
- 验收标准:
  - 四层 Agent 完整工作链路（意图识别 → 海选 → 初筛 → 深度分析）
  - 流式返回分析进度和结果
  - 完整的 UI 体验
  - 可公开访问并演示

---

### 阶段 6: 性能优化 (Performance Phase)

**目标**: 降低成本 + 提升响应速度

#### ✅ Proposal 11: `add-caching-layer` (原 Proposal 10)
- **优先级**: 🟢 P2 (可选)
- **目标**: 引入 Redis 缓存，避免重复 API 调用
- **输出**:
  - Vercel KV / Upstash Redis 集成
  - 智能缓存策略 (TTL: 24h)
  - 缓存命中率监控
- **涉及能力**:
  - `caching` - 缓存层
- **预计耗时**: 1-2 天
- **依赖**: Proposal 9
- **状态**: 📝 未开始

**🎯 Milestone 6: 生产就绪** (完成 Proposal 10-11 后达成)
- 验收标准:
  - UI 美观，符合"极客风格"
  - 响应速度 < 5s (对于缓存命中的查询)
  - 进度展示清晰，提升用户体验
  - 成本可控

---

## 📊 优先级说明

- 🔴 **P0 (必选)**: MVP 的必要组成部分，缺一不可
- 🟠 **P1 (核心)**: 核心业务逻辑，定义产品价值
- 🟢 **P2 (可选)**: 体验优化和性能提升，可后续迭代

---

## 🔄 状态标识

- 📝 **未开始** (Not Started)
- 🚧 **进行中** (In Progress)
- ✅ **已完成** (Completed)
- 📦 **已归档** (Archived)
- ⏸️ **暂停** (Paused)

---

## 📅 时间估算（更新）

### 阶段进度
| 阶段 | Proposal | 状态 | 预计时间 |
|------|----------|------|---------|
| **1. PoC** | 1-2 | ✅ 完成 | 2-4 天 |
| **2. Web 基础** | 3 | ✅ 完成 | 1-2 天 |
| **3. Multi-Agent** | 4-7 | 📝 未开始 | 8-10 天 |
| **4. UI 完善** | 8 | 📝 未开始 | 2-3 天 |
| **5. 实时体验** | 9-10 | 📝 未开始 | 4-6 天 |
| **6. 性能优化** | 11 | 📝 未开始 | 1-2 天 |

### 最快路径 (MVP = Proposal 1-9)
- 阶段 1: 2-4 天 ✅ **已完成**
- 阶段 2: 1-2 天 ✅ **已完成**
- 阶段 3: 6-7 天 (更新后)
  - Proposal 4-6 (搜索流程): 3-4 天
    - Query Translator + Scout + Screener 合并实现
    - 多维度评分体系
  - Proposal 7 (Auditor + Star History): 2-3 天
    - 按需加载架构
    - OSS Insight API 集成
- **阶段 4 (新增 UI 完善)**: 2-3 天
- 阶段 5: 2-3 天（流式 UI，依赖阶段 4）
- **总计**: 约 **15-22 天**

### 完整版本 (含优化 = Proposal 1-11)
- 额外: 3-5 天
- **总计**: 约 **18-27 天**

---

## 🎯 关键里程碑时间线

```
Day 0-4:   [✅ Milestone 1: PoC 完成]
Day 5-6:   [✅ Milestone 2: 最小 Web 版本上线]
Day 7-16:  [📝 Milestone 3: Multi-Agent 系统完成] ← 当前位置
Day 17-19: [📝 Milestone 4: UI 基础完整] ← 新增确认点
Day 20-22: [📝 Milestone 5: MVP 完整上线]
Day 23-27: [📝 Milestone 6: 生产就绪] (可选)
```

---

## 🚀 下一步行动

**当前焦点**: Proposal 4 - `add-query-translator-agent`

**Proposal 3 总结** ✅:
- ✅ Next.js 15 项目搭建完成
- ✅ Shadcn/ui 组件集成
- ✅ API Route 实现并集成 GitHub + LLM
- ✅ 最小化 UI (输入框 + 报告展示)
- ✅ Vercel 部署成功: https://oh-my-github-nine.vercel.app
- ✅ 版本标签: v0.1.0

**下一步准备**:
在开始 Proposal 4 之前，需要创建对应的 openspec 提案文档：
```bash
# 1. 创建 Proposal 4 提案目录
mkdir -p openspec/changes/add-query-translator-agent

# 2. 编写提案文档
# - proposal.md: 提案概述
# - design.md: 架构设计
# - tasks.md: 实现清单
# - specs/: 需求规范

# 3. 验证提案
openspec validate add-query-translator-agent --strict

# 4. 应用提案并开始实现
openspec apply add-query-translator-agent
```

---

## 🔑 关键决策记录

### 为什么拆分 Proposal 3？

**原因**: 选择 Option A（最小化实现）以加快验证速度

**好处**:
1. **快速验证**: 1-2天即可上线，验证端到端流程
2. **降低风险**: 更少的代码 = 更少的 bug
3. **灵活调整**: Multi-Agent 系统可以在简单 UI 上开发和测试
4. **针对性优化**: 有了 Agent 系统后，UI 设计更有针对性

**策略**:
- **Proposal 3 (现在)**: 最小化基础 → 快速上线
- **Proposal 4-7**: Multi-Agent 开发 → 功能验证
- **Proposal 8 (新增)**: 完整 UI 基础 → 为流式输出做准备 ← **UI 确认点**
- **Proposal 9**: 流式 UI → 实时体验
- **Proposal 10-11**: 打磨和优化

### 为什么 Proposal 8 是关键节点？

**原因**: 这是 **UI 完整性的确认执行点**

**时机选择**:
- ✅ **在 Agent 系统完成后** (Proposal 7)
  - 有了完整的数据流，UI 设计更有针对性
  - 知道需要展示哪些 Agent 步骤
  - 可以设计更合理的信息架构

- ✅ **在流式输出之前** (Proposal 9)
  - 流式 UI 需要完整的布局结构来展示进度
  - ChatSidebar 用于展示 Agent 思考过程
  - CanvasArea 用于动态更新结果

**验收标准**:
- ✅ Landing page + Workspace 完整
- ✅ 双面板布局可用（Chat 30% + Canvas 70%）
- ✅ 所有 UI 组件符合 ui_spec.md 规范
- ✅ 为流式输出预留清晰的 UI 接口

---

## 📝 变更记录

| 日期 | 变更内容 | 原因 |
|------|---------|------|
| 2026-01-13 | 初始化 Roadmap | 项目启动 |
| 2026-01-14 | **重大重组：拆分 Proposal 3，新增 Proposal 8** | 选择 Option A 策略，确保 UI 完整性有明确执行节点 |
| 2026-01-14 | 更新 Proposal 1-2 状态为"已归档" | PoC 阶段完成 |
| 2026-01-14 | 调整后续 Proposal 编号 (8→9, 9→10, 10→11) | 为新增的 Proposal 8 腾出编号 |
| 2026-01-14 | 更新时间估算：MVP 从 13-17 天调整为 15-22 天 | 反映拆分后的实际时间线 |
| 2026-01-15 | **Proposal 3 完成，Milestone 2 达成** | Next.js MVP 部署成功，阶段 2 完成 |
| 2026-01-15 | 更新 Git 工作流为 GitHub Flow | 从 dev 分支迁移到 main 作为默认分支 |

---

## 💡 给未来开发者的建议

1. **不要跳过 Proposal 3（最小化基础）**
   - 即使你很想直接做完整 UI，也要先验证最小版本
   - 这可以让你快速发现 API 集成问题

2. **不要在 Proposal 4-7 阶段纠结 UI**
   - Agent 系统可以在简单列表上测试
   - 过早优化 UI 会分散精力

3. **认真对待 Proposal 8（完整 UI 基础）**
   - 这是 UI 完整性的最后机会
   - 没有好的布局，流式输出会很难实现
   - 这是 ui_spec.md 设计真正落地的时候

4. **Proposal 9（流式 UI）依赖 Proposal 8**
   - 如果跳过或仓促完成 Proposal 8，Proposal 9 会很痛苦
   - 好的架构让流式输出事半功倍

5. **Proposal 10-11 可以延后**
   - UI 打磨和缓存是锦上添花
   - 但 Proposal 1-9 是 MVP 的必选项
