# LLM 层架构设计文档

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Caller                           │
│                    (GitHub Data Layer / CLI)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     lib/analysis.ts                              │
│              (集成层 - Orchestration Layer)                       │
│                                                                   │
│  • analyzeRepository()      - 单仓库分析入口                      │
│  • compareRepositories()    - 多仓库对比                          │
│  • calculateMetrics()       - 指标计算                           │
│  • filterContributionIssues() - Issue智能过滤                    │
└──────┬──────────────────────┬──────────────────┬────────────────┘
       │                      │                  │
       │                      │                  │
       ▼                      ▼                  ▼
┌─────────────┐      ┌─────────────┐    ┌──────────────┐
│  lib/llm/   │      │lib/reports/ │    │  lib/github/ │
│ (LLM模块)   │      │(报告模块)   │    │ (数据层)     │
└─────────────┘      └─────────────┘    └──────────────┘
```

## 📦 核心模块详解

### 1. **集成层 (`lib/analysis.ts`)**

**职责**: 端到端流程编排，连接数据层和LLM层

**核心函数**:

#### `analyzeRepository()`
```typescript
输入:
  - metadata: RepositoryMetadata       // GitHub仓库元数据
  - calculatedMetrics: CalculatedMetrics // 预计算的指标
  - filteredIssues: IssueData[]         // 预过滤的Issue列表
  - options: AnalysisOptions            // 分析选项

流程:
  1. 创建LLM客户端 (createLLMClient)
  2. 验证客户端配置 (client.validate)
  3. 格式化数据 (formatRepositoryData)
  4. 选择提示词模板 (REPOSITORY_ANALYSIS_PROMPT / BRIEF)
  5. 调用LLM分析 (client.analyze)
  6. 解析响应 (parseAnalysisResponse)
  7. 生成报告 (generateReport)
  8. 验证报告 (validateReport)

输出:
  - report: Report                      // 生成的报告
  - validation: ValidationResult        // 验证结果
  - tokenUsage: TokenUsage             // Token使用统计
```

#### `compareRepositories()`
```typescript
输入: 多个仓库的数据数组
流程: 循环调用 analyzeRepository()
输出: AnalysisOutput[] + 累计成本统计
```

#### `filterContributionIssues()`
```typescript
输入: IssueData[]
逻辑:
  1. 过滤开放的Issue
  2. 优先级1: 有"good first issue"标签的
  3. 优先级2: 最近90天创建的Issue
  4. 去重并限制到30个
输出: IssueData[] (过滤后的列表)
```

---

### 2. **LLM 模块 (`lib/llm/`)**

#### 2.1 `client.ts` - LLM客户端

**核心类**: `LLMClient`

```typescript
class LLMClient {
  private client: OpenAI              // OpenAI SDK客户端
  private config: LLMConfig           // 配置信息
  private cumulativeUsage: TokenUsage // 累计使用统计

  // 核心方法
  async validate()                    // 验证配置
  async analyze(system, user)         // 执行分析
  private retryWithExponentialBackoff() // 重试机制
  getCumulativeUsage()                // 获取累计统计
}
```

**关键特性**:
- **Token追踪**: 每次请求记录输入/输出token和成本
- **自动重试**: 指数退避（1s, 2s, 4s），最多3次
- **错误处理**: 区分可重试错误（网络、超时、429）和不可重试错误
- **成本估算**: 基于DeepSeek V3定价自动计算

**配置项**:
```typescript
{
  apiKey: string                    // API密钥
  baseURL: string                   // API地址（默认DeepSeek）
  model: string                     // 模型名称（默认deepseek-chat）
  timeout: number                   // 超时时间（默认60秒）
  maxRetries: number                // 最大重试次数（默认3次）
  inputCostPerMillion: number       // 输入成本（默认$0.27/M）
  outputCostPerMillion: number      // 输出成本（默认$1.10/M）
}
```

#### 2.2 `prompts.ts` - 提示词管理

**核心模板**:

1. **`REPOSITORY_ANALYSIS_PROMPT`** (详细分析)
```typescript
{
  system: string    // 系统提示 - 定义角色和输出格式（中文JSON）
  user: function    // 用户提示生成函数 - 接收格式化数据
}
```

2. **`BRIEF_REPOSITORY_ANALYSIS_PROMPT`** (简短分析)
```typescript
// 结构同上，但提示词更简洁，减少token使用
```

**关键函数**:

```typescript
// 模板变量插值
interpolate(template: string, data: object): string

// 格式化仓库数据为提示词
formatRepositoryData(
  metadata: RepositoryMetadata,
  calculatedMetrics: CalculatedMetrics,
  filteredIssues: IssueData[]
): Record<string, unknown>
```

**数据格式化逻辑**:
- 将指标转换为易读字符串（如 "PR Merge Rate: 85.0%"）
- 格式化Issue列表为 "#123: Title [labels] (date)"
- 所有文本使用中文

#### 2.3 `parser.ts` - 响应解析

**核心接口**:

```typescript
interface AnalysisResult {
  summary: string
  activityAnalysis: {
    interpretation: string
    confidence: "high" | "medium" | "low"
  }
  contributionOpportunities: {
    assessment: string
    suitableIssues: string[]
    confidence: "high" | "medium" | "low"
  }
  onboardingAssessment: {
    evaluation: string
    strengths: string[]
    concerns: string[]
    confidence: "high" | "medium" | "low"
  }
  recommendations: string[]
}
```

**核心函数**:

```typescript
// 解析LLM响应（带容错）
parseAnalysisResponse(content: string):
  AnalysisResult | PartialAnalysisResult

// 内部函数
validateAnalysisStructure(data: unknown): ValidationResult
createPartialResult(parsed, errors): PartialAnalysisResult
extractConfidenceIndicators(): Array<{section, confidence}>
```

**容错机制**:
- JSON解析失败 → 返回错误信息
- 字段缺失 → 提取可用字段，标记为部分结果
- 字段类型错误 → 记录验证错误

---

### 3. **报告模块 (`lib/reports/`)**

#### 3.1 `generator.ts` - 报告生成

**核心函数**:

```typescript
// 主入口 - 根据格式调用相应生成器
generateReport(
  analysis: AnalysisResult,
  metadata: ReportMetadata,
  format: "markdown" | "text" | "json",
  metrics?: CalculatedMetrics,
  detailLevel?: "brief" | "detailed"
): Report

// 格式特定生成器
generateMarkdownReport()  // Markdown格式（默认）
generateTextReport()      // 纯文本格式
generateJSONReport()      // JSON格式
```

**Markdown生成流程**:
```typescript
1. generateReportHeader(metadata)           // 元数据头部
2. generatePartialWarning(result)           // 部分结果警告（如有）
3. generateSummarySection(summary)          // 执行摘要
4. generateMetricsSection(metrics)          // 关键指标表格 ✨
5. generateActivitySection(activity)        // 活动分析 + 置信度
6. generateContributionSection(contrib)     // 贡献机会
7. generateOnboardingSection(onboarding)    // 新手引导
8. generateRecommendationsSection(recs)     // 建议列表
9. generateReportFooter(analysis)           // 页脚
```

**混合模板实现**:
- **预计算指标** → 直接注入Markdown表格（100%准确）
- **LLM分析** → 插入对应章节（语义理解）

**置信度徽章**:
```typescript
🟢 high    - 高置信度
🟡 medium  - 中等置信度
🔴 low     - 低置信度
```

#### 3.2 `templates.ts` - 报告模板

**模板定义**:

```typescript
interface ReportTemplate {
  name: string                // 模板名称
  description: string         // 模板描述
  sections: ReportSection[]   // 章节定义
}

interface ReportSection {
  id: string                  // 章节ID
  title: string               // 章节标题
  type: "metric" | "llm-analysis" | "hybrid"
  required: boolean           // 是否必需
  order: number               // 显示顺序
}
```

**预定义模板**:
1. `DEFAULT_CONTRIBUTION_ANALYSIS_TEMPLATE` - 完整贡献分析
2. `BRIEF_ANALYSIS_TEMPLATE` - 简短分析
3. `COMPARATIVE_ANALYSIS_TEMPLATE` - 对比分析

**工具函数**:
```typescript
getTemplate(name: string): ReportTemplate
validateTemplateSections(): ValidationResult
getSectionOrder(): string[]
```

#### 3.3 `validator.ts` - 报告验证

**核心函数**:

```typescript
// 主验证函数
validateReport(report: Report): ValidationResult

// 子验证函数
validateMarkdownReport(content: string): ValidationResult
validateJSONReport(content: string): ValidationResult
validateSectionCompleteness(content: string): ValidationResult
validateMetadata(metadata): ValidationResult
validateMarkdownSyntax(markdown: string): ValidationResult
```

**检查项**:

1. **元数据完整性**
   - repositoryName, analysisDate, llmProvider 必须存在
   - tokenUsage 必须有效

2. **章节完整性**
   - 必需章节：Summary, Recommendations
   - 可选章节：Activity Analysis, Contribution, Onboarding

3. **Markdown语法**
   - 标题层级正确
   - 表格列数一致
   - 代码块闭合
   - 链接有效

4. **JSON结构**
   - 有效的JSON格式
   - 包含metadata和analysis字段

---

## 🔄 完整调用流程

### 典型使用场景：分析单个仓库

```typescript
// 1. 外部调用者准备数据
const metadata = await fetchGitHubMetadata("facebook/react")
const metrics = calculateMetrics(rawData)
const issues = filterContributionIssues(allIssues)

// 2. 调用分析函数
const result = await analyzeRepository(metadata, metrics, issues, {
  detailLevel: "detailed",
  reportFormat: "markdown",
  includeMetrics: true
})

// 内部流程：

// 3. [lib/analysis.ts] 创建LLM客户端
const client = createLLMClient()
await client.validate()

// 4. [lib/llm/prompts.ts] 格式化数据
const formattedData = formatRepositoryData(metadata, metrics, issues)
//   → 输出: { repoFullName, metrics, recentCommits, openIssues, ... }

// 5. [lib/llm/prompts.ts] 选择提示词
const prompt = REPOSITORY_ANALYSIS_PROMPT
const systemPrompt = prompt.system  // 中文系统提示
const userPrompt = prompt.user(formattedData)  // 插值后的用户提示

// 6. [lib/llm/client.ts] 调用LLM
const llmResult = await client.analyze(systemPrompt, userPrompt)
//   内部:
//     - 构造OpenAI请求（temperature=0.7, response_format=json_object）
//     - 自动重试（最多3次，指数退避）
//     - 记录token使用和成本
//   输出: { content, usage, model, provider }

// 7. [lib/llm/parser.ts] 解析响应
const analysisResult = parseAnalysisResponse(llmResult.content)
//   内部:
//     - JSON.parse(content)
//     - validateAnalysisStructure(parsed)
//     - 如果失败 → createPartialResult()
//   输出: AnalysisResult | PartialAnalysisResult

// 8. [lib/reports/generator.ts] 生成报告
const report = generateReport(
  analysisResult,
  {
    repositoryName: metadata.full_name,
    analysisDate: new Date().toISOString(),
    llmProvider: llmResult.provider,
    llmModel: llmResult.model,
    tokenUsage: llmResult.usage,
    dataFreshness: metadata.updated_at,
    isPartial: analysisResult.isPartial
  },
  "markdown",
  metrics,
  "detailed"
)
//   内部:
//     - generateMarkdownReport()
//       - generateReportHeader()
//       - generateMetricsSection() ← 直接注入预计算指标
//       - generateActivitySection() ← 插入LLM分析
//       - ... 其他章节
//   输出: Report { content, metadata, format }

// 9. [lib/reports/validator.ts] 验证报告
const validation = validateReport(report)
//   内部:
//     - validateMetadata()
//     - validateMarkdownReport()
//     - validateSectionCompleteness()
//   输出: { isValid, errors, warnings }

// 10. 返回结果
return { report, validation, tokenUsage: llmResult.usage }
```

---

## 📊 数据流图

```
GitHub API Data
      │
      ▼
┌─────────────────┐
│ Repository      │
│ Metadata        │  ← full_name, stars, forks, language, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ Metrics         │  ← PR merge rate, response time
└────────┬────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│ Filter Issues   │          │ Format Data     │
│                 │          │ for Prompts     │
└────────┬────────┘          └────────┬────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ LLM Analysis    │
              │ (DeepSeek V3)   │
              └────────┬────────┘
                       │
                       ▼ (JSON Response)
              ┌─────────────────┐
              │ Parse & Validate│
              └────────┬────────┘
                       │
                       ├────────────────────┐
                       │                    │
                       ▼                    ▼
              ┌─────────────────┐  ┌─────────────────┐
              │ Pre-calculated  │  │ LLM Generated   │
              │ Metrics         │  │ Analysis        │
              └────────┬────────┘  └────────┬────────┘
                       │                    │
                       └────────┬───────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Hybrid Template │
                       │ Report          │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Validate Report │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Final Report    │
                       │ (MD/Text/JSON)  │
                       └─────────────────┘
```

---

## 🎯 关键设计决策

### 1. **混合模板方法**
**问题**: LLM可能在数值计算上产生错误
**解决方案**:
- 数值指标在代码中预计算（100%准确）
- LLM只负责语义分析和建议（发挥其优势）
- 报告中分别注入两类内容

### 2. **结构化JSON输出**
**问题**: LLM自由文本输出难以解析
**解决方案**:
- 强制要求JSON格式（`response_format: {type: "json_object"}`）
- 详细定义JSON schema在系统提示中
- 实现容错解析器处理部分结果

### 3. **三层验证**
**问题**: 如何确保报告质量
**解决方案**:
1. LLM输出验证（parser.ts）
2. 报告结构验证（validator.ts）
3. Markdown语法验证（validator.ts）

### 4. **智能重试机制**
**问题**: 网络不稳定、API限流
**解决方案**:
- 区分可重试和不可重试错误
- 指数退避避免过载（1s→2s→4s）
- 最多3次重试平衡成本和可靠性

### 5. **成本追踪**
**问题**: 需要监控使用成本
**解决方案**:
- 每次请求记录token使用
- 自动计算成本（基于配置的价格）
- 提供累计统计功能

---

## 🔧 扩展点

### 1. 添加新的LLM提供商
```typescript
// 在 client.ts 中:
// 1. 扩展 LLMConfig 支持新的 baseURL
// 2. 调整价格配置
// 3. 可能需要调整 response_format 参数
```

### 2. 自定义报告模板
```typescript
// 在 templates.ts 中:
export const MY_CUSTOM_TEMPLATE: ReportTemplate = {
  name: "custom",
  sections: [...]
}
```

### 3. 添加新的报告格式
```typescript
// 在 generator.ts 中:
export function generatePDFReport(...) {
  // 使用库如 puppeteer 或 pdfkit
}
```

### 4. 多语言支持
```typescript
// 在 prompts.ts 中:
export const ENGLISH_ANALYSIS_PROMPT = {...}
export const CHINESE_ANALYSIS_PROMPT = {...}

// 在 analysis.ts 中添加 language 选项
```

---

## 📈 性能指标

| 指标 | 当前值 | 说明 |
|------|--------|------|
| 平均Token使用 | ~1,200 tokens | 详细模式 |
| 平均Token使用 | ~930 tokens | 简短模式 |
| 平均成本 | $0.0008 | 详细分析 |
| 平均成本 | $0.0006 | 简短分析 |
| 平均响应时间 | ~21秒 | 包含网络延迟 |
| 成功率 | 100% | 测试样本 |

---

## 🐛 常见问题

### Q: LLM返回格式错误怎么办？
A: parser.ts 会自动处理：
- 尝试提取可用字段
- 返回 PartialAnalysisResult
- 在报告中显示警告

### Q: 如何控制成本？
A: 三种方法：
1. 使用简短模式（token减少22%）
2. 更严格的Issue过滤（减少输入）
3. 批量处理时监控累计成本

### Q: 超时怎么处理？
A: client.ts 自动处理：
- 默认60秒超时
- 自动重试（指数退避）
- 最终失败会抛出清晰错误

### Q: 如何调试提示词？
A:
1. 查看 `client.ts` 的日志输出
2. 使用 `scripts/test-llm.ts` 单独测试
3. 调整 `prompts.ts` 中的模板

---

*最后更新: 2026-01-13*
