# Proposal 4 架构决策记录

> **决策日期**: 2026-01-15
> **参与者**: Claude Code + @Octane0411
> **目的**: 为 Proposal 4-7 (Query Translator + Scout + Screener + Auditor) 的实现确定架构方案

---

## 🎯 核心决策总结

### 1. Multi-Agent 架构模式

**Horizon 1 (当前)**：Sequential Pipeline
**Horizon 2 (未来)**：Supervisor + Tools
**Horizon 3 (远期)**：Hierarchical Planning

#### H1 → H2 演进路径
- H1 Pipeline 封装成 Tool
- Supervisor Agent 根据用户意图调用不同 Tools
- 完全向后兼容，无需重写 H1 代码

**参考文档**: `/ARCHITECTURE.md`

---

### 2. Pipeline 内部并行架构

#### 数据流
```
用户输入 → Query Translator → Scout → Screener → 返回列表
                                                     ↓
用户点击 → Auditor → 详细分析 + Star History
```

#### 并行点
1. **Scout**: 3 个搜索策略并行（Stars、Updated、Expanded）
2. **Screener 精筛**: 25 个 LLM 评估并行
3. **Auditor**: 按需分析（用户点击时触发）

#### 关键决策：Screener 两阶段筛选
- **阶段 1**: 规则粗筛（50-100 → 25）
  - 基于 Stars、更新时间、License 等
  - 快速过滤明显不合适的
- **阶段 2**: LLM + GitHub API 精筛（25 → 10）
  - LLM 评估相关性、文档质量、易用性
  - GitHub API 获取 Releases、Contributors
  - 并行执行，3-5 秒完成

**成本**: ~$0.02/次
**速度**: 8-10 秒返回列表

---

### 3. 交互模式：按需加载

#### 用户体验流程
```
1. 用户输入查询 (0s)
   ↓
2. 显示 Top 10 列表 (8-10s)
   [立即可见，无需等待详细分析]

3. 用户点击感兴趣的项目 (0s)
   ↓
4. 显示详细分析 (3-5s)
   [仅分析这一个项目]
```

#### API 设计
- **`/api/search`**: 搜索 + 筛选（返回候选列表）
- **`/api/analyze-repo`**: 单个项目深度分析
- **`/api/search/more`**: 查看更多候选

**优势**:
- 用户等待时间减少 50%（8s vs 13s）
- 成本降低 50%（如果用户只看 3 个详情）
- 更灵活（用户自主选择）

---

### 4. 多维度评分体系

#### 6 个核心维度
1. **Maturity** (成熟度) - 基于元数据计算
2. **Activity** (活跃度) - 基于元数据计算
3. **Documentation** (文档质量) - LLM 评估
4. **Community** (社区健康度) - 基于元数据计算
5. **Ease of Use** (易用性) - LLM 评估
6. **Maintenance** (维护状态) - GitHub API + 元数据

#### 计算策略
- **快速指标**（Maturity、Activity、Community、Maintenance）
  - 基于 GitHub 元数据
  - 不需要 LLM
  - 并行计算，速度快

- **需要理解的指标**（Documentation、Ease of Use）
  - LLM 评估（读 README 预览）
  - 在 Screener 精筛阶段同时计算

#### 展示形式
- 雷达图（6 维度可视化）
- 综合评分（0-10）
- 每个维度的简短说明

**成本**: 包含在 Screener 的 LLM 调用中，无额外成本

---

### 5. Star History 和增长数据 ✅ 已确定

#### Proposal 4-7 (MVP 阶段)

**策略**: 使用 GitHub API 采样
**实现**:
- 获取最近的 Stargazers（500-1000 个）
- 计算近 7 天、30 天增长率
- 数据用于内部排序，**不在列表页展示**

**理由**:
- 保持列表页简洁快速
- 避免过早引入复杂性
- 使用官方 API，无外部依赖

**成本**: $0（GitHub API 免费）
**耗时**: +1 秒（并行请求）

---

#### Proposal 7+ (Auditor 详情)

**策略**: 集成 OSS Insight API
**实现**:
- 仅在用户点击查看详情时调用
- 获取完整 Star History 曲线数据
- 缓存 24 小时

**展示内容**:
- ✅ 完整 K 线图（Star History 曲线）
- ✅ 增长趋势分析（LLM 生成文字）
- ✅ 关键里程碑标注
- ❌ 列表页增长指标（不展示）
- ❌ Trending 数据（不需要）

**数据源选择**:
| 方案 | 优势 | 劣势 | 决策 |
|------|------|------|------|
| OSS Insight API | 数据权威、功能丰富、免费 | 需要 API Key、Rate Limit | ✅ 采用 |
| Star-history.com | 简单易用 | 非官方、不稳定 | ❌ |
| 自建 Archive | 完全可控 | 开发成本高 | ❌ MVP 不考虑 |

**理由**:
- OSS Insight 基于 GitHub Archive，数据最权威
- 免费且功能丰富
- 只在详情页调用，成本可控

**成本**: 免费（需要申请 API Key）
**耗时**: +2-3 秒（详情页加载）

---

#### Trending 数据

**决策**: ❌ 不需要 Trending 数据

**理由**:
- Trending 榜单变化快，价值有限
- 增加复杂度（爬虫或第三方 API）
- Star History 已经能反映热度趋势
- 可以通过 Search API 模拟"潜力股"

---

### 6. 技术栈确定

#### Horizon 1 (Proposal 4-7)
- **状态管理**: LangGraph.js
- **LLM**: DeepSeek V3
- **数据源**:
  - GitHub REST API（主要）
  - OSS Insight API（Auditor 阶段）
- **前端**: Next.js 15 App Router
- **图表**: Recharts（雷达图、K 线图）
- **缓存**: 内存缓存或 Redis

#### 依赖安装
```bash
# LangGraph
bun add @langchain/langgraph @langchain/core

# GitHub API Client
bun add @octokit/rest

# 图表库
bun add recharts

# LLM（已有 DeepSeek）
```

---

## 📊 成本和性能预估

### 完整搜索流程

| 阶段 | 操作 | 耗时 | 成本 |
|------|------|------|------|
| Query Translator | 1 次 LLM | 1s | $0.0001 |
| Scout | 3 个 GitHub API | 2s | $0 |
| Screener 阶段 1 | 规则过滤 | <1s | $0 |
| Screener 阶段 2 | 25 次 LLM + GitHub API | 4-5s | $0.02 |
| **返回列表** | - | **8-10s** | **$0.02** |
| 用户点击详情 | - | - | - |
| Auditor | 1 次 LLM + GitHub API | 3-5s | $0.005 |
| OSS Insight | 获取 Star History | 2s | $0 |
| **返回详情** | - | **5-7s** | **$0.005** |

**用户体验**:
- 列表：8-10 秒
- 每个详情：5-7 秒
- 总成本（查看 3 个详情）：~$0.035

---

## 📁 目录结构

```
lib/agents/
  h1-search/              # Workflow 1: 搜索流程
    workflow.ts           # LangGraph 状态机
    query-translator/     # Agent 1
      index.ts
      llm-tool.ts
      keyword-db.ts
    scout/                # Agent 2
      index.ts
      strategies.ts       # 多策略搜索
    screener/             # Agent 3
      index.ts
      coarse-filter.ts    # 阶段 1: 规则粗筛
      fine-scorer.ts      # 阶段 2: LLM 精筛
      dimensions.ts       # 多维度评分计算

  h1-auditor/             # Workflow 2: 独立 Auditor
    index.ts              # 单个 repo 深度分析
    star-history.ts       # OSS Insight 集成

  types.ts                # 共享类型定义
  utils.ts                # 工具函数

app/api/
  search/
    route.ts              # POST: 搜索 + 筛选
  analyze-repo/
    route.ts              # POST: 单个详细分析

components/
  RepoCard.tsx            # 项目卡片（含雷达图）
  RepoDetail.tsx          # 项目详情（含 K 线图）
```

---

## ✅ 验收标准

### Proposal 4-6 (搜索流程)
- [ ] 用户输入自然语言 → 自动转化为 GitHub 搜索参数
- [ ] 多策略搜索找到 50-100 个候选
- [ ] 两阶段筛选返回 Top 10
- [ ] 每个项目有 6 维度评分和雷达图
- [ ] 列表页加载时间 < 10 秒
- [ ] 成本 < $0.03/次

### Proposal 7 (详细分析)
- [ ] 用户点击项目 → 生成详细分析报告
- [ ] 报告包含 Star History K 线图
- [ ] 增长趋势分析（文字）
- [ ] 详情页加载时间 < 8 秒
- [ ] 成本 < $0.01/次

---

## 🔄 未来扩展 (Horizon 2+)

### 可选增强（根据用户反馈）
- 生命周期阶段判断（种子期/成长期/成熟期/衰退期）
- 投资建议（类似股票分析）
- 预测模型（基于历史趋势预测未来）

### 长期愿景
- 自建 GitHub Archive 数据平台
- 支持更复杂的分析和预测
- 条件：用户量大、需要高度定制化

---

## 📚 参考资料

- **VISION.md**: 四个 Horizon 的长期愿景
- **ARCHITECTURE.md**: 完整架构演进路径
- **openspec_roadmap.md**: Proposal 优先级和时间规划
- **LangGraph 官方文档**: https://langchain-ai.github.io/langgraph/
- **OSS Insight**: https://ossinsight.io

---

**最后更新**: 2026-01-15
**状态**: ✅ 决策完成，准备创建 openspec proposal
