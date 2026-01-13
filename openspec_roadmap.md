# OpenSpec Roadmap

> oh-my-github 项目的渐进式开发路线图

## 开发原则

**核心策略**: 风险驱动 + 由内而外 (Inside-Out)
- 先验证核心能力（数据 + AI），再搭建架构
- 先实现功能闭环（能用），再打磨体验（好用）
- 每个 Proposal 都是可独立验证的里程碑

---

## 📋 Proposal 清单

### 阶段 1: 核心能力验证 (PoC Phase)
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
- **状态**: 📝 未开始

---

#### ✅ Proposal 2: `add-llm-analysis-pipeline`
- **优先级**: 🔴 P0 (必选)
- **目标**: 验证 LLM 分析能力和 Prompt 效果
- **输出**:
  - LLM 测试脚本，输出结构化 Markdown 研报
  - 调优后的 Prompt 模板
  - Token 成本评估
- **涉及能力**:
  - `llm-integration` - OpenRouter/Claude/DeepSeek 接入
  - `report-generation` - 结构化研报生成
- **预计耗时**: 1-2 天
- **依赖**: 无
- **状态**: 📝 未开始

---

### 阶段 2: 基础架构搭建 (Foundation Phase)
**目标**: 建立 Next.js 全栈框架

#### ✅ Proposal 3: `add-nextjs-foundation`
- **优先级**: 🔴 P0 (必选)
- **目标**: 搭建 Next.js + TypeScript 基础架构
- **输出**:
  - 可运行的 Next.js 项目
  - 基础 API Route: `/api/analyze`
  - 最简页面: 输入框 + 按钮 + 结果展示区
- **涉及能力**:
  - `frontend-ui` - 页面结构
  - `api-routes` - 后端接口
- **预计耗时**: 1 天
- **依赖**: Proposal 1, 2
- **状态**: 📝 未开始

---

### 阶段 3: Multi-Agent 系统实现 (Core Agent Phase)
**目标**: 实现四层漏斗模型 (Intent Understanding → Sourcing → Screening → Deep Dive)

#### ✅ Proposal 4: `add-query-translator-agent`
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现"意图识别"Agent (The Query Translator)
- **输出**:
  - 自然语言 → GitHub 搜索参数转化引擎
  - 支持"发散程度"控制 (Low/Medium/High)
  - 能处理创意级别动态扩展关键词
- **涉及能力**:
  - `agent-query-translator` - 意图识别 Agent
  - `llm-integration` - LLM 调用（可选，初版用字典）
- **预计耗时**: 1-2 天
- **依赖**: Proposal 3
- **状态**: 📝 未开始

---

#### ✅ Proposal 5: `add-scout-agent`
- **优先级**: 🟠 P1 (核心功能)
- **目标**: 实现"海选"Agent (The Scout)
- **输出**:
  - 用户输入关键词 → 返回 Top 50-100 候选项目
  - 去重、清洗逻辑
- **涉及能力**:
  - `agent-scout` - 海选 Agent
  - `state-management` - LangGraph 状态管理
- **预计耗时**: 2 天
- **依赖**: Proposal 4
- **状态**: 📝 未开始

---

#### ✅ Proposal 6: `add-screener-agent`
- **优先级**: 🟠 P1 (核心功能)
- **目标**: 实现"初筛"Agent (The Screener)
- **输出**:
  - 多维度打分系统 (活跃度 40% + 门槛 30% + 规模 30%)
  - 从 50-100 个候选缩减到 Top 10
- **涉及能力**:
  - `agent-screener` - 初筛 Agent
  - `scoring-algorithm` - 加权打分逻辑
- **预计耗时**: 2 天
- **依赖**: Proposal 5
- **状态**: 📝 未开始

---

#### ✅ Proposal 7: `add-auditor-agent`
- **优先级**: 🟠 P1 (核心功能)
- **目标**: 实现"深度尽调"Agent (The Auditor)
- **输出**:
  - 代码库深度扫描 (README, CONTRIBUTING, 文件树, 依赖)
  - 生成结构化 Markdown 研报
  - 包含: 上手指南 + 任务推荐 + 避坑提示
- **涉及能力**:
  - `agent-auditor` - 深度分析 Agent
  - `code-analysis` - 代码审计逻辑
- **预计耗时**: 3-4 天
- **依赖**: Proposal 6
- **状态**: 📝 未开始

---

### 阶段 4: 用户体验优化 (UX Enhancement Phase)
**目标**: 解决超时问题 + 透明化进度展示

#### ✅ Proposal 8: `add-streaming-ui`
- **优先级**: 🔴 P0 (必选)
- **目标**: 实现流式传输，解决 Vercel 超时限制
- **输出**:
  - Edge Runtime + Vercel AI SDK 集成
  - 后端支持流式响应
  - 前端实时渲染 Agent 执行步骤
- **涉及能力**:
  - `streaming-api` - 流式 API
  - `progressive-rendering` - 渐进式 UI 更新
- **预计耗时**: 2 天
- **依赖**: Proposal 7
- **状态**: 📝 未开始

---

#### ✅ Proposal 9: `add-ui-polish`
- **优先级**: 🟢 P2 (可选)
- **目标**: 美化 UI，实现"透明化进度展示"
- **输出**:
  - GitHub 风格的暗色主题
  - 进度条 + 步骤日志（类似黑客控制台）
  - Recharts 雷达图展示项目评分
- **涉及能力**:
  - `ui-components` - Shadcn/ui 组件库
  - `progress-visualization` - 可视化进度展示
- **预计耗时**: 2-3 天
- **依赖**: Proposal 8
- **状态**: 📝 未开始

---

### 阶段 5: 性能优化 (Performance Phase)
**目标**: 降低成本 + 提升响应速度

#### ✅ Proposal 10: `add-caching-layer`
- **优先级**: 🟢 P2 (可选)
- **目标**: 引入 Redis 缓存，避免重复 API 调用
- **输出**:
  - Vercel KV / Upstash Redis 集成
  - 智能缓存策略 (TTL: 24h)
- **涉及能力**:
  - `caching` - 缓存层
- **预计耗时**: 1 天
- **依赖**: Proposal 8
- **状态**: 📝 未开始

---

## 🎯 里程碑定义

### Milestone 1: PoC 完成
- ✅ Proposal 1 完成
- ✅ Proposal 2 完成
- **验收标准**: 能在终端看到 "输入关键词 → 打印候选项目 → 打印 LLM 研报"

### Milestone 2: MVP 上线
- ✅ Proposal 1-8 完成
- **验收标准**: 
  - 用户能通过网页输入关键词
  - 系统能流式返回完整的分析报告
  - 四层 Agent 完整工作链路（意图识别 → 海选 → 初筛 → 深度分析）
  - 可部署到 Vercel 并公开访问

### Milestone 3: 体验优化
- ✅ Proposal 9-10 完成
- **验收标准**:
  - UI 美观，符合"极客风格"
  - 响应速度 < 5s (对于缓存命中的查询)
  - 进度展示清晰，提升用户体验

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

## 📅 时间估算

**最快路径 (MVP)**:
- 阶段 1: 2-4 天
- 阶段 2: 1 天
- 阶段 3: 8-10 天（新增 Query Translator Agent）
  - Proposal 4 (Query Translator): 1-2 天
  - Proposal 5 (Scout): 2 天
  - Proposal 6 (Screener): 2 天
  - Proposal 7 (Auditor): 3-4 天
- 阶段 4: 2 天
- **总计**: 约 13-17 天

**完整版本 (含优化)**:
- 额外 3-4 天
- **总计**: 约 16-21 天

---

## 🚀 下一步行动

**当前焦点**: Proposal 1 - `add-github-data-layer`

**准备工作**:
1. 申请 GitHub Personal Access Token
2. 安装 Octokit SDK
3. 阅读 GitHub Search API 文档

**启动命令**:
```bash
# 创建第一个 Proposal
mkdir -p openspec/changes/add-github-data-layer/specs
cd openspec/changes/add-github-data-layer
touch proposal.md tasks.md
```

---

## 📝 变更记录

| 日期 | 变更内容 | 原因 |
|------|---------|------|
| 2026-01-13 | 初始化 Roadmap | 项目启动 |