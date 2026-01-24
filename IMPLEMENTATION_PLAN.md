# Implementation Plan: Open Source Contribution Guide

> **目标**: 将 feat/contribution-guide 分支从"项目推荐"转变为"贡献指南"系统
> **分支**: `feat/contribution-guide` (从 main 创建)
> **预计耗时**: 5-7 天（代码）+ 2-3 天（测试优化）

---

## 📋 Phase 1: Agent & Tools 改进（2-3 天）

### 1.1 更新 Consultant Agent Prompt

**文件**: `/lib/agents/consultant/prompts.ts`

**核心改动**:
```typescript
// FROM:
"You are the Skill Discovery Consultant"
// 推荐库来生成Skill

// TO:
"You are the Contribution Guide Consultant"
// 推荐项目来做开源贡献
```

**关键改变**:

1. **澄清用户兴趣**（新增）
   ```
   问题1: 你对什么领域感兴趣？(AI/Web/数据库/DevOps等)
   问题2: 你熟悉什么语言？(Python/JavaScript/Go等)
   问题3: 你是初学者还是有一定经验？
   ```

2. **推荐项目的标准**（改变）
   ```
   OLD: 这个库最好用，因为...
   NEW: 这个项目很适合贡献，因为：
        - 项目活跃，maintainer友好
        - 有Good First Issues
        - 对新手很友好
   ```

3. **生成的内容**（改变）
   ```
   OLD: 推荐库 + 为什么选它 + Skill代码
   NEW: 推荐项目 + 为什么适合你 + 贡献指南
   ```

### 1.2 重新定义 Tools

**文件**: `/lib/agents/consultant/tools.ts`

**删除**:
```typescript
❌ export async function findRepository()
❌ export async function generateSkill()
```

**新增**:
```typescript
✅ export async function findProjects()
✅ export async function analyzeProject()
✅ export async function generateContributionGuide()
```

#### Tool 1: findProjects
```typescript
interface FindProjectsParams {
  interests: string[];          // "AI", "Web", "Database"
  skillLevel: "beginner" | "intermediate" | "advanced";
  languagePreference: string;   // "Python", "JavaScript"
}

interface ProjectResult {
  projects: Array<{
    name: string;               // e.g., "langchain"
    url: string;
    description: string;
    stars: number;
    language: string;
    lastUpdate: string;
    reasons: string[];          // 为什么推荐这个
  }>;
}
```

**实现方式**:
- 利用现有的 H1 Search Pipeline
- Query Translator: 将兴趣转为搜索参数
- Scout: 搜索相关项目
- Screener: 筛选并排序
- 返回 Top 5-10 项目

#### Tool 2: analyzeProject
```typescript
interface AnalyzeProjectParams {
  projectUrl: string;           // e.g., "https://github.com/langchain-ai/langchain"
  skillLevel?: "beginner" | "intermediate" | "advanced";
}

interface ProjectAnalysis {
  // 活跃度指标
  activityScore: number;        // 0-100
  lastCommitDaysAgo: number;
  issuesOpenCount: number;
  pullRequestsOpenCount: number;
  
  // 新手友好度
  friendlinessScore: number;    // 0-100
  goodFirstIssuesCount: number;
  hasContributingGuide: boolean;
  averageIssueResponseTime: string;
  
  // 项目难度
  difficultyScore: number;      // 0-100
  codebaseSize: string;         // "small", "medium", "large"
  testCoverage: number;
  
  // 综合评估
  recommendation: string;       // "why this project is great for you"
  suggestedIssueTypes: string[]; // "bug", "feature", "documentation"
  estimatedLearningCurve: string; // "steep", "moderate", "gentle"
}
```

**实现方式**:
- 获取项目元数据（GitHub API）
- 分析Issues和PRs
- 评估Contributing guide
- 生成活跃度、友好度、难度评分
- 提供个性化建议

#### Tool 3: generateContributionGuide
```typescript
interface GenerateContributionGuideParams {
  projectUrl: string;
  projectName: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
}

interface ContributionGuide {
  overview: string;            // 项目简介
  setupSteps: Step[];          // Fork, Clone, Install
  developmentSetup: {
    prerequisites: string[];
    commands: string[];
  };
  firstIssueAdvice: string;    // 找第一个Issue的建议
  prSubmissionChecklist: {
    steps: string[];
    commonMistakes: string[];
  };
  resources: {
    contributingGuide: string;
    documentation: string;
    issues: string;
  };
}
```

**实现方式**:
- 读取项目的 README 和 CONTRIBUTING.md
- 解析项目设置指南
- 生成逐步的设置说明
- 提供PR提交建议
- 按skill level定制内容

### 1.3 更新 Tool Executor

**文件**: `/lib/agents/consultant/tool-executor.ts`

**改动**:
- 删除 `executeGenerateSkillWithEvents`
- 添加 `executeFindProjectsWithEvents`
- 添加 `executeAnalyzeProjectWithEvents`
- 添加 `executeGenerateContributionGuideWithEvents`

每个函数都应该支持事件流（streaming）。

### 1.4 更新 API Route

**文件**: `/app/api/consultant/route.ts`

**改动**:
```typescript
// FROM:
tools: {
  findRepository: tool(...),
  generateSkill: tool(...),
}

// TO:
tools: {
  findProjects: tool(...),
  analyzeProject: tool(...),
  generateContributionGuide: tool(...),
}
```

---

## 🎨 Phase 2: UI 更新（1-2 天）

### 2.1 删除旧的Skill相关组件

```
❌ /components/chat-ui/skill-delivery-card.tsx
❌ /components/chat-ui/fabricator-block.tsx
```

### 2.2 创建新的展示组件

#### Component 1: ProjectRecommendationCard
```typescript
interface ProjectRecommendationCardProps {
  project: {
    name: string;
    url: string;
    description: string;
    stars: number;
    language: string;
    reasons: string[];
  };
  onSelect: (projectUrl: string) => void;
}
```

展示内容：
- 项目名称、描述、URL
- 星数、语言
- 为什么推荐这个（2-3行文案）
- "了解更多" 按钮

#### Component 2: ProjectAnalysisCard
```typescript
interface ProjectAnalysisCardProps {
  analysis: ProjectAnalysis;
  projectName: string;
}
```

展示内容：
- 活跃度评分（可视化）
- 新手友好度评分
- 难度评分
- 推荐的Issue类型
- 学习曲线评估
- "生成贡献指南" 按钮

#### Component 3: ContributionGuideBlock
```typescript
interface ContributionGuideBlockProps {
  guide: ContributionGuide;
  currentStep?: number;
  totalSteps?: number;
}
```

展示内容：
- 逐步的设置指南（可折叠）
- Fork/Clone 步骤
- 本地开发环境设置
- 第一个Issue的建议
- PR提交清单
- 常见问题

### 2.3 改进现有组件

#### ConversationBlock
- 改进展示"澄清问题"的方式
- 改进展示"项目推荐"的过渡

#### ScoutBlock
- 改名为 ProjectSearchBlock（或保持名称不变）
- 展示"搜索项目"的进度而不是"搜索库"

---

## 📊 Phase 3: 数据流集成（1 天）

### 3.1 改进Consultant Agent的决策流程

```
用户输入: "我想为AI项目贡献，Python开发者"
  ↓
[澄清需求]
  Agent: "初学者还是有经验?"
  User: "初学者"
  ↓
[调用 findProjects Tool]
  输入: interests=["AI"], skillLevel="beginner", language="Python"
  ↓
[显示推荐的项目（5个）]
  ↓
[用户选择一个项目]
  ↓
[调用 analyzeProject Tool]
  输入: projectUrl="https://github.com/langchain-ai/langchain"
  输出: 活跃度、难度、新手友好度评分
  ↓
[显示项目分析]
  ↓
[用户点击"生成贡献指南"]
  ↓
[调用 generateContributionGuide Tool]
  输入: projectUrl, skillLevel="beginner"
  输出: 完整的上手指南
  ↓
[显示贡献指南]
```

### 3.2 改进 Chat Store

**文件**: `/lib/stores/chat-store.ts`

确保能正确存储和展示：
- 项目推荐
- 项目分析
- 贡献指南

---

## 🧪 Phase 4: 测试和优化（2-3 天）

### 4.1 手动测试场景

1. **场景1：初学者搜索AI项目**
   - 输入：兴趣、技能水平
   - 验证：推荐的项目是否合适
   - 验证：分析是否准确
   - 验证：指南是否完整

2. **场景2：有经验的开发者找挑战**
   - 输入：高级技能水平
   - 验证：推荐的项目难度是否更高
   - 验证：指南是否涵盖advanced topics

3. **场景3：多个项目对比**
   - 推荐多个项目
   - 用户可以查看分析和指南
   - 用户可以比较不同项目

### 4.2 代码质量检查

- [ ] 类型安全（TypeScript）
- [ ] 错误处理
- [ ] 边界情况处理
- [ ] 性能（响应时间）
- [ ] 代码注释

### 4.3 简历项目验收

- [ ] README 清楚说明项目做什么
- [ ] 代码结构清晰
- [ ] 有注释解释关键逻辑
- [ ] 可以demo给面试官
- [ ] 能用3句话解释核心创意

---

## 📅 时间表

```
Week 1:
  Day 1-2: Phase 1.1-1.4 (Agent & Tools)
  Day 3-4: Phase 2 (UI)
  Day 5:   Phase 3 (集成)

Week 2:
  Day 1-3: Phase 4 (测试和优化)
  Day 4:   准备简历项目展示
  Day 5:   收尾、文档、部署
```

---

## ✅ 成功标准

### MVP验收
- ✅ 用户能输入兴趣和技能水平
- ✅ 系统能推荐5-10个相关项目
- ✅ 每个项目有清晰的活跃度和难度评估
- ✅ 用户能获得具体的贡献指南
- ✅ UI清晰，交互流畅

### 代码质量
- ✅ 代码无 TypeScript 错误
- ✅ 关键函数有注释
- ✅ 错误处理完整
- ✅ 没有console.log日志输出（使用logger）

### 简历项目
- ✅ README 5分钟内讲清楚
- ✅ Demo 2分钟内展示核心功能
- ✅ 代码质量好看
- ✅ 有说不出来要解释的技术点

---

## 🚀 关键设计决策

### 决策1：复用H1 Search Pipeline还是重新写一个？
**选择**：复用H1 Pipeline
**理由**：
- 已经验证的搜索逻辑
- 避免重复写轮子
- 专注在Agent/UI改进上

### 决策2：项目分析用API还是LLM？
**选择**：主要用GitHub API，少量LLM分析
**理由**：
- GitHub API数据更准确（活跃度、issue数量等）
- 成本更低
- 速度更快
- LLM用来生成人类友好的总结

### 决策3：贡献指南是生成还是模板？
**选择**：LLM生成 + 项目特定信息
**理由**：
- 更个性化
- 每个项目都不同
- 能适应不同skill level

---

## 📝 文件检查清单

### 需要修改的文件
- [ ] `/lib/agents/consultant/prompts.ts` - 改Prompt
- [ ] `/lib/agents/consultant/tools.ts` - 改Tools定义
- [ ] `/lib/agents/consultant/tool-executor.ts` - 改执行逻辑
- [ ] `/app/api/consultant/route.ts` - 改API Route
- [ ] `/components/chat-ui/` - 删除旧组件，添加新组件
- [ ] `/lib/stores/chat-store.ts` - 改数据存储结构

### 需要删除的文件
- [ ] `/components/chat-ui/skill-delivery-card.tsx`
- [ ] `/components/chat-ui/fabricator-block.tsx`

### 需要创建的文件
- [ ] `/components/chat-ui/project-recommendation-card.tsx`
- [ ] `/components/chat-ui/project-analysis-card.tsx`
- [ ] `/components/chat-ui/contribution-guide-block.tsx`

---

**版本**: 1.0  
**日期**: 2026-01-25  
**准备状态**: ✅ 所有前期规划已完成，可开始编码
