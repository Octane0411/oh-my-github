import type {
  AnalysisResult,
  PartialAnalysisResult,
} from "../llm/parser.ts";
import type { TokenUsage } from "../llm/client.ts";

/**
 * Report format options
 */
export type ReportFormat = "markdown" | "text" | "json";

/**
 * Report detail level
 */
export type ReportDetailLevel = "brief" | "detailed";

/**
 * Report metadata
 */
export interface ReportMetadata {
  repositoryName: string;
  analysisDate: string;
  llmProvider: string;
  llmModel: string;
  tokenUsage: TokenUsage;
  dataFreshness: string;
  isPartial?: boolean;
  availableSections?: string[];
}

/**
 * Complete report with content and metadata
 */
export interface Report {
  content: string;
  metadata: ReportMetadata;
  format: ReportFormat;
}

/**
 * Pre-calculated metrics for hybrid templating
 */
export interface CalculatedMetrics {
  prMergeRate?: number;
  avgIssueResponseTime?: string;
  avgPRResponseTime?: string;
  recentCommitCount?: number;
  openPRCount?: number;
  contributorCount?: number;
}

/**
 * Generates a structured Markdown report from analysis results
 * @param analysis - LLM analysis result
 * @param metadata - Report metadata
 * @param metrics - Pre-calculated metrics
 * @param detailLevel - Report detail level
 * @returns Generated report in Markdown format
 */
export function generateMarkdownReport(
  analysis: AnalysisResult | PartialAnalysisResult,
  metadata: ReportMetadata,
  metrics?: CalculatedMetrics,
  detailLevel: ReportDetailLevel = "detailed"
): Report {
  const sections: string[] = [];

  // Header with metadata
  sections.push(generateReportHeader(metadata));

  // Partial result warning
  if ("isPartial" in analysis && analysis.isPartial) {
    sections.push(generatePartialWarning(analysis));
  }

  // Executive summary
  if (analysis.summary) {
    sections.push(generateSummarySection(analysis.summary));
  }

  // Pre-calculated metrics section (hybrid approach)
  if (metrics && detailLevel === "detailed") {
    sections.push(generateMetricsSection(metrics));
  }

  // Activity analysis
  if (analysis.activityAnalysis) {
    sections.push(
      generateActivitySection(analysis.activityAnalysis, detailLevel)
    );
  }

  // Contribution opportunities
  if (analysis.contributionOpportunities) {
    sections.push(
      generateContributionSection(analysis.contributionOpportunities, detailLevel)
    );
  }

  // Onboarding assessment
  if (analysis.onboardingAssessment) {
    sections.push(
      generateOnboardingSection(analysis.onboardingAssessment, detailLevel)
    );
  }

  // Recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    sections.push(generateRecommendationsSection(analysis.recommendations));
  }

  // Footer with confidence indicators
  sections.push(generateReportFooter(analysis));

  const content = sections.join("\n\n");

  return {
    content,
    metadata,
    format: "markdown",
  };
}

/**
 * Generates report header with metadata
 */
function generateReportHeader(metadata: ReportMetadata): string {
  return `# Repository Analysis: ${metadata.repositoryName}

**Analysis Date**: ${metadata.analysisDate}
**LLM Provider**: ${metadata.llmProvider} (${metadata.llmModel})
**Token Usage**: ${metadata.tokenUsage.totalTokens} tokens (~$${metadata.tokenUsage.estimatedCost.toFixed(4)})
**Data Freshness**: ${metadata.dataFreshness}`;
}

/**
 * Generates warning for partial results
 */
function generatePartialWarning(result: PartialAnalysisResult): string {
  return `> ⚠️ **Partial Analysis**: This report is incomplete due to parsing errors. Available sections: ${result.availableSections.join(", ")}
> Error details: ${result.error}`;
}

/**
 * Generates executive summary section
 */
function generateSummarySection(summary: string): string {
  return `## Executive Summary

${summary}`;
}

/**
 * Generates pre-calculated metrics section
 */
function generateMetricsSection(metrics: CalculatedMetrics): string {
  const rows: string[] = [];

  if (metrics.prMergeRate !== undefined) {
    rows.push(
      `| PR Merge Rate | ${(metrics.prMergeRate * 100).toFixed(1)}% |`
    );
  }
  if (metrics.avgIssueResponseTime) {
    rows.push(`| Avg Issue Response Time | ${metrics.avgIssueResponseTime} |`);
  }
  if (metrics.avgPRResponseTime) {
    rows.push(`| Avg PR Response Time | ${metrics.avgPRResponseTime} |`);
  }
  if (metrics.recentCommitCount !== undefined) {
    rows.push(`| Recent Commits (30 days) | ${metrics.recentCommitCount} |`);
  }
  if (metrics.contributorCount !== undefined) {
    rows.push(`| Active Contributors | ${metrics.contributorCount} |`);
  }

  if (rows.length === 0) {
    return "";
  }

  return `## Key Metrics

| Metric | Value |
|--------|-------|
${rows.join("\n")}`;
}

/**
 * Generates activity analysis section
 */
function generateActivitySection(
  activity: {
    interpretation: string;
    confidence: "high" | "medium" | "low";
  },
  detailLevel: ReportDetailLevel
): string {
  const confidenceBadge = getConfidenceBadge(activity.confidence);

  return `## Activity Analysis ${confidenceBadge}

${activity.interpretation}`;
}

/**
 * Generates contribution opportunities section
 */
function generateContributionSection(
  contrib: {
    assessment: string;
    suitableIssues: string[];
    confidence: "high" | "medium" | "low";
  },
  detailLevel: ReportDetailLevel
): string {
  const confidenceBadge = getConfidenceBadge(contrib.confidence);
  const issuesList =
    contrib.suitableIssues.length > 0
      ? "\n\n**Recommended Issues for New Contributors:**\n" +
        contrib.suitableIssues.map((issue) => `- ${issue}`).join("\n")
      : "";

  return `## Contribution Opportunities ${confidenceBadge}

${contrib.assessment}${issuesList}`;
}

/**
 * Generates onboarding assessment section
 */
function generateOnboardingSection(
  onboarding: {
    evaluation: string;
    strengths: string[];
    concerns: string[];
    confidence: "high" | "medium" | "low";
  },
  detailLevel: ReportDetailLevel
): string {
  const confidenceBadge = getConfidenceBadge(onboarding.confidence);

  const strengthsList =
    onboarding.strengths.length > 0
      ? "\n\n**Strengths:**\n" +
        onboarding.strengths.map((s) => `- ✅ ${s}`).join("\n")
      : "";

  const concernsList =
    onboarding.concerns.length > 0
      ? "\n\n**Concerns:**\n" +
        onboarding.concerns.map((c) => `- ⚠️ ${c}`).join("\n")
      : "";

  return `## Onboarding Assessment ${confidenceBadge}

${onboarding.evaluation}${strengthsList}${concernsList}`;
}

/**
 * Generates recommendations section
 */
function generateRecommendationsSection(recommendations: string[]): string {
  const items = recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join("\n");

  return `## Recommendations

${items}`;
}

/**
 * Generates report footer with confidence summary
 */
function generateReportFooter(
  analysis: AnalysisResult | PartialAnalysisResult
): string {
  return `---

*Generated by oh-my-github LLM analysis pipeline*`;
}

/**
 * Gets a confidence badge for display
 */
function getConfidenceBadge(
  confidence: "high" | "medium" | "low"
): string {
  const badges = {
    high: "🟢",
    medium: "🟡",
    low: "🔴",
  };
  return badges[confidence];
}

/**
 * Generates a plain text report
 * @param analysis - LLM analysis result
 * @param metadata - Report metadata
 * @returns Generated report in plain text format
 */
export function generateTextReport(
  analysis: AnalysisResult | PartialAnalysisResult,
  metadata: ReportMetadata
): Report {
  // Convert markdown to plain text (remove formatting)
  const markdownReport = generateMarkdownReport(analysis, metadata);
  const plainText = markdownReport.content
    .replace(/#{1,6}\s+/g, "") // Remove headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\|(.*?)\|/g, "$1") // Remove table formatting
    .replace(/[✅⚠️🟢🟡🔴]/g, "") // Remove emojis
    .trim();

  return {
    content: plainText,
    metadata,
    format: "text",
  };
}

/**
 * Generates a structured JSON report
 * @param analysis - LLM analysis result
 * @param metadata - Report metadata
 * @returns Generated report in JSON format
 */
export function generateJSONReport(
  analysis: AnalysisResult | PartialAnalysisResult,
  metadata: ReportMetadata
): Report {
  const jsonData = {
    metadata,
    analysis,
  };

  return {
    content: JSON.stringify(jsonData, null, 2),
    metadata,
    format: "json",
  };
}

/**
 * Generates a report in the specified format
 * @param analysis - LLM analysis result
 * @param metadata - Report metadata
 * @param format - Output format
 * @param metrics - Pre-calculated metrics (for Markdown only)
 * @param detailLevel - Report detail level
 * @returns Generated report
 */
export function generateReport(
  analysis: AnalysisResult | PartialAnalysisResult,
  metadata: ReportMetadata,
  format: ReportFormat = "markdown",
  metrics?: CalculatedMetrics,
  detailLevel: ReportDetailLevel = "detailed"
): Report {
  switch (format) {
    case "markdown":
      return generateMarkdownReport(analysis, metadata, metrics, detailLevel);
    case "text":
      return generateTextReport(analysis, metadata);
    case "json":
      return generateJSONReport(analysis, metadata);
    default:
      throw new Error(`Unsupported report format: ${format}`);
  }
}
