/**
 * Prompt template for repository analysis
 */
export interface PromptTemplate {
  system: string;
  user: (data: Record<string, unknown>) => string;
}

/**
 * Interpolates variables into a template string
 * @param template - Template string with {{variable}} placeholders
 * @param data - Data object with variable values
 * @returns Interpolated string
 */
export function interpolate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return match; // Keep placeholder if value not found
    }
    // Handle different value types
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  });
}

/**
 * System prompt for repository analysis
 * Instructs the LLM to output structured JSON format
 */
const ANALYSIS_SYSTEM_PROMPT = `你是一位专业的软件工程分析师，专门评估开源代码仓库。

你的任务是分析仓库元数据，并提供关于贡献机会、项目健康度和新手引导体验的结构化见解。

重要：你必须**仅使用中文**回复，并且必须返回有效的JSON格式：
{
  "summary": "2-3句话的执行摘要，突出关键要点（中文）",
  "activityAnalysis": {
    "interpretation": "分析提交模式、Issue/PR活动趋势，以及它们对项目健康度的指示意义（中文）",
    "confidence": "high|medium|low"
  },
  "contributionOpportunities": {
    "assessment": "详细分析新贡献者的切入点，包括具体的Issue推荐（中文）",
    "suitableIssues": ["适合新手的具体Issue标题或ID数组（中文）"],
    "confidence": "high|medium|low"
  },
  "onboardingAssessment": {
    "evaluation": "评估文档质量、设置复杂度和对贡献者的友好程度（中文）",
    "strengths": ["积极的新手引导方面的数组（中文）"],
    "concerns": ["新贡献者可能遇到的障碍数组（中文）"],
    "confidence": "high|medium|low"
  },
  "recommendations": ["3-5个具体的、可操作的建议，供潜在贡献者参考（中文）"]
}

重点关注：
- 建议要具体且可操作
- 识别适合新贡献者的具体Issue
- 诚实地强调优势和关注点
- 在数据有限时提供置信度指标
- 所有文本内容必须使用中文`;

/**
 * User prompt template for repository analysis
 * Accepts pre-calculated metrics and pre-filtered issues
 */
const ANALYSIS_USER_TEMPLATE = `请分析以下仓库并提供结构化的见解：

**仓库**: {{repoFullName}}

**预计算的指标**:
{{metrics}}

**最近活动**:
- 提交数（最近30天）: {{recentCommits}}
- 开放的Issue: {{openIssues}}
- 开放的Pull Request: {{openPRs}}

**预筛选的Issue** (包含可能适合新贡献者的有标签和无标签的Issue):
{{filteredIssues}}

**其他信息**:
- Stars数量: {{stars}}
- Forks数量: {{forks}}
- 主要语言: {{language}}
- 许可证: {{license}}
- 最后更新: {{lastUpdated}}

请按照系统提示中指定的JSON格式提供你的分析（必须使用中文）。`;

/**
 * Repository analysis prompt template
 */
export const REPOSITORY_ANALYSIS_PROMPT: PromptTemplate = {
  system: ANALYSIS_SYSTEM_PROMPT,
  user: (data) => interpolate(ANALYSIS_USER_TEMPLATE, data),
};

/**
 * Formats repository metadata for LLM analysis
 * @param metadata - Repository metadata from GitHub API
 * @param calculatedMetrics - Pre-calculated metrics (PR merge rate, response times, etc.)
 * @param filteredIssues - Pre-filtered issues for contribution analysis
 * @returns Formatted data for prompt interpolation
 */
export function formatRepositoryData(
  metadata: {
    full_name: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    license: { name: string } | null;
    updated_at: string;
    open_issues_count: number;
  },
  calculatedMetrics: {
    prMergeRate?: number;
    avgIssueResponseTime?: string;
    avgPRResponseTime?: string;
    recentCommitCount?: number;
    openPRCount?: number;
  },
  filteredIssues: Array<{
    number: number;
    title: string;
    labels: string[];
    created_at: string;
  }>
): Record<string, unknown> {
  // Format metrics as a readable string
  const metricsLines = [
    calculatedMetrics.prMergeRate !== undefined
      ? `- PR Merge Rate: ${(calculatedMetrics.prMergeRate * 100).toFixed(1)}%`
      : null,
    calculatedMetrics.avgIssueResponseTime
      ? `- Avg Issue Response Time: ${calculatedMetrics.avgIssueResponseTime}`
      : null,
    calculatedMetrics.avgPRResponseTime
      ? `- Avg PR Response Time: ${calculatedMetrics.avgPRResponseTime}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Format filtered issues for analysis
  const issuesText = filteredIssues
    .slice(0, 20) // Limit to 20 issues to avoid context bloat
    .map(
      (issue) =>
        `#${issue.number}: ${issue.title} [${issue.labels.length > 0 ? issue.labels.join(", ") : "no labels"}] (${new Date(issue.created_at).toLocaleDateString()})`
    )
    .join("\n");

  return {
    repoFullName: metadata.full_name,
    metrics: metricsLines || "No pre-calculated metrics available",
    recentCommits: calculatedMetrics.recentCommitCount ?? "N/A",
    openIssues: metadata.open_issues_count,
    openPRs: calculatedMetrics.openPRCount ?? "N/A",
    filteredIssues: issuesText || "No suitable issues found",
    stars: metadata.stargazers_count,
    forks: metadata.forks_count,
    language: metadata.language || "Not specified",
    license: metadata.license?.name || "No license",
    lastUpdated: new Date(metadata.updated_at).toLocaleDateString(),
  };
}

/**
 * Brief analysis prompt for quick repository overview
 * Uses less detailed context to reduce token usage
 */
const BRIEF_ANALYSIS_USER_TEMPLATE = `请对此仓库进行简要分析：

**仓库**: {{repoFullName}}
**Stars**: {{stars}} | **Forks**: {{forks}} | **语言**: {{language}}
**开放Issue**: {{openIssues}} | **开放PR**: {{openPRs}}

重点关注：1) 整体项目健康度, 2) 最佳贡献机会, 3) 关键问题（如果有）

请按照系统提示中指定的JSON格式提供分析（必须使用中文），但保持每个字段简洁。`;

/**
 * Brief repository analysis prompt template
 */
export const BRIEF_REPOSITORY_ANALYSIS_PROMPT: PromptTemplate = {
  system: ANALYSIS_SYSTEM_PROMPT,
  user: (data) => interpolate(BRIEF_ANALYSIS_USER_TEMPLATE, data),
};
