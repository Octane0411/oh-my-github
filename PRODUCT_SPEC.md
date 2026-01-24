# Oh-My-GitHub: Open Source Contribution Guide

## 产品定义（最终版）

### 🎯 核心价值主张

**问题**：开发者想为开源项目贡献，但不知道从哪开始
- 项目太多，不知道选哪个
- 不知道项目的活跃度和新手友好度
- 不知道如何开始（Fork、运行、提交PR）

**解决方案**：
1. 用户描述兴趣和技能
2. Agent推荐最适合的项目（基于活跃度、难度、维护者友好度）
3. 提供完整的上手指南（Fork、本地运行、提交第一个PR）

### 📊 用户旅程

```
1. 用户输入
   "我想为AI/ML项目做贡献，熟悉Python"
   ↓
2. Agent理解并推荐
   "基于你的兴趣，这5个项目很适合："
   ↓
3. 显示项目详情
   - 活跃度、贡献难度、维护者友好度
   - 现有的Easy/Good First Issues
   - 为什么适合新手
   ↓
4. 生成上手指南
   - 如何Fork/Clone
   - 如何本地运行
   - 第一个PR的建议
   - 常见问题
   ↓
5. 用户开始贡献
```

---

## 架构设计

### 🏗️ 现有资产（main分支）

#### H1 Search Pipeline
```
用户查询
  ↓
Query Translator (理解查询 → 结构化参数)
  ↓
Scout (多策略搜索 → 50-100个候选)
  ↓
Screener (两阶段筛选 → Top 10评分结果)
  ↓
Top 10个项目
```

**这个Pipeline本身是对的**，适合用来搜索开源项目。

#### Agent Coordinator
- 多Agent编排框架
- 对话管理
- 流式处理

**这个也可以用**，但需要改进prompts和logic。

#### Chat UI
- 对话界面
- 消息展示
- 流式更新

**可以用来展示项目和指南**。

### ❌ 需要删除的

```
❌ H2 Skill Discovery Pipeline (库推荐系统)
❌ Skill Fabricator (Skill生成系统)
❌ ACS评分系统 (针对库的，不是项目)
❌ Skill相关的UI组件
```

### ✅ 需要改进的

#### 1. Consultant Agent Prompts
**旧**：推荐库来生成Skill
**新**：推荐项目来做贡献

改动点：
- 改变推荐标准（从"是否好用"→"是否适合新手贡献"）
- 增加项目分析能力（活跃度、issue难度、maintainer友好度）
- 增加贡献指南生成能力

#### 2. Tools定义
**旧**：findRepository (库) + generateSkill
**新**：
  - `findProjects` (搜索开源项目)
  - `analyzeProject` (分析项目的贡献友好度)
  - `generateContributionGuide` (生成上手指南)

#### 3. Tool Executor
需要从H1 Pipeline获取项目，然后分析它们。

#### 4. UI展示
**旧**：Skill卡片 + 代码
**新**：
  - 项目卡片（名称、描述、活跃度、星数）
  - 项目分析（为什么适合你、难度评估）
  - 贡献指南（具体步骤）

---

## 实现计划

### Phase 1：改进Agent和Tools（2-3天）

#### 1.1 更新Consultant Agent Prompt
```
目标：从"推荐库"改为"推荐项目做贡献"

改动：
- 澄清用户兴趣（技术栈、项目类型）
- 澄清技能水平（初学者、中级、高级）
- 调用 findProjects Tool
- 对推荐的项目进行分析
- 生成贡献指南
```

#### 1.2 重新定义Tools

**Tool 1: findProjects**
```
输入：
  - 兴趣领域 (AI, Web, 数据库等)
  - 技能水平 (beginner/intermediate/advanced)
  - 语言偏好 (Python, JavaScript等)
  
利用H1 Search Pipeline搜索项目

输出：
  - 项目名称、描述、URL
  - 星数、最后更新时间
  - 主要语言
```

**Tool 2: analyzeProject**
```
输入：
  - 项目 URL/名称
  
分析内容：
  - 活跃度 (最近多久有commit/release)
  - 贡献友好度 (Good First Issues数量, Contributing.md是否存在)
  - Maintainer响应速度 (PR/Issue平均响应时间)
  - 难度评估 (代码库大小、复杂度)
  - 新手友好指数 (综合评分)

输出：
  - 项目活跃度评分
  - 贡献难度评分
  - 为什么适合你的理由
  - 推荐的Issue类型
```

**Tool 3: generateContributionGuide**
```
输入：
  - 项目 URL
  - 用户技能水平
  
生成内容：
  - Fork和Clone步骤
  - 本地开发环境设置
  - 代码结构介绍
  - 提交第一个PR的步骤
  - 常见问题和解决方案
  - 需要注意的contribution guidelines

输出：
  - Markdown格式的完整指南
```

### Phase 2：更新UI（1-2天）

**替换的组件**：
- ❌ skill-delivery-card → ✅ project-recommendation-card
- ❌ fabricator-block → ✅ contribution-guide-block
- 改进：project-analysis-card

**新的展示流程**：
1. 用户输入兴趣 → 对话澄清
2. 显示推荐的项目列表
3. 用户选择一个项目 → 显示详细分析
4. 显示贡献指南

### Phase 3：测试和优化（1-2天）

---

## 关键改动点

### 从"Skill工厂"到"贡献指南"

| 维度 | Skill Factory | Contribution Guide |
|------|---|---|
| **用户问题** | "我想要这个功能的库" | "我想为开源做贡献" |
| **输入** | 功能需求 | 兴趣和技能 |
| **输出** | Skill代码 | 项目推荐 + 上手指南 |
| **核心Agent能力** | 库推荐 + 代码生成 | 项目推荐 + 项目分析 + 指南生成 |
| **评分维度** | ACS (Interface/Documentation/Economy) | 活跃度/新手友好度/difficulty |
| **成功指标** | 用户使用Skill | 用户提交第一个PR |

---

## 文件清理计划

### 根目录需要删除的文档
```
❌ VISION.md (旧愿景，关于Skill Factory)
❌ VISION-2.0.md (旧愿景2.0)
❌ PRODUCT_DESIGN.md (旧产品设计，关于Skill)
❌ INTERACTION_FLOW.md (旧交互流程，关于Skill)
❌ prototype.md (原型，关于贡献指南但已过时)
❌ PROPOSAL_4_DECISIONS.md (旧提案)
❌ technical_design.md (旧技术设计)
❌ ui_spec.md (旧UI规范)
```

### 需要保留的文档
```
✅ README.md (项目介绍)
✅ ARCHITECTURE.md (架构概览)
✅ CONTRIBUTING.md (贡献指南)
✅ TESTING.md (测试指南)
✅ AGENTS.md (Agent相关规则)
✅ CLAUDE.md (Claude rules)
```

### 新增文档
```
📝 PRODUCT_SPEC.md (这个文件 - 产品规范)
📝 openspec/specs/contribution-guide/ (新的openspec规范)
```

---

## 成功指标

### MVP成功标准
- ✅ 用户能输入兴趣，获得项目推荐
- ✅ 每个项目有清晰的活跃度、难度评估
- ✅ 用户能获得具体的贡献指南
- ✅ 指南详细到"第一个PR"的步骤

### 简历项目价值
- ✅ 清晰的问题定义（开源贡献新手困难）
- ✅ Agent多能力编排（推荐 + 分析 + 指南生成）
- ✅ 实际有用的系统
- ✅ 技术难度适中（LangGraph + 多Tool编排）

---

**版本**: 1.0  
**日期**: 2026-01-25  
**状态**: 最终确定的产品规范
