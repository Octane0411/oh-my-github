import { NextResponse } from 'next/server';
import { getOctokit } from '@/lib/github/client';
import { extractRepositoryMetadata } from '@/lib/github/metadata';
import { analyzeRepository, filterContributionIssues } from '@/lib/analysis';
import type { RepositoryMetadata as AnalysisMetadata, IssueData } from '@/lib/analysis';
import type { CalculatedMetrics } from '@/lib/reports/generator';

export async function POST(request: Request) {
  try {
    // 1. Validate environment variables
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ENV_VAR',
            message: 'GITHUB_TOKEN environment variable is not configured',
          },
        },
        { status: 500 }
      );
    }

    if (!process.env.DEEPSEEK_V3_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ENV_VAR',
            message: 'DEEPSEEK_V3_API_KEY environment variable is not configured',
          },
        },
        { status: 500 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const { repo } = body;

    if (!repo || typeof repo !== 'string' || !repo.includes('/')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REPO',
            message: 'Repository must be in format "owner/name" (e.g., "facebook/react")',
          },
        },
        { status: 400 }
      );
    }

    const [owner, name] = repo.split('/');
    if (!owner || !name) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REPO',
            message: 'Invalid repository format',
          },
        },
        { status: 400 }
      );
    }

    // 3. Extract repository metadata from GitHub
    const fullMetadata = await extractRepositoryMetadata(owner, name);

    // 4. Get basic repository info for license/stars
    const octokit = getOctokit();
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo: name });

    // 5. Fetch recent issues for contribution analysis
    const { data: issuesData } = await octokit.rest.issues.listForRepo({
      owner,
      repo: name,
      state: 'open',
      per_page: 100,
      sort: 'created',
      direction: 'desc',
    });

    // 6. Transform metadata to analysis format
    const analysisMetadata: AnalysisMetadata = {
      full_name: fullMetadata.fullName,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      language: fullMetadata.complexity.primaryLanguage,
      license: repoData.license ? { name: repoData.license.name } : null,
      updated_at: repoData.updated_at,
      open_issues_count: fullMetadata.openIssuesCount,
      description: fullMetadata.description,
    };

    // 7. Calculate metrics
    const calculatedMetrics: CalculatedMetrics = {
      prMergeRate: fullMetadata.prStats.mergeRate,
      avgIssueResponseTime: fullMetadata.avgIssueResponseTime
        ? `${Math.round(fullMetadata.avgIssueResponseTime / 24)} days`
        : undefined,
      avgPRResponseTime: undefined, // Not available in current metadata
      recentCommitCount: fullMetadata.recentCommits,
      openPRCount: fullMetadata.prStats.total - fullMetadata.prStats.merged - fullMetadata.prStats.closed,
      contributorCount: fullMetadata.contributorStats.totalContributors,
    };

    // 8. Transform issues data
    const issues: IssueData[] = issuesData.map((issue) => ({
      number: issue.number,
      title: issue.title,
      labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name || '')),
      created_at: issue.created_at,
      state: issue.state,
    }));

    // 9. Filter issues for contribution opportunities
    const filteredIssues = filterContributionIssues(issues);

    // 10. Run LLM analysis
    const analysisResult = await analyzeRepository(
      analysisMetadata,
      calculatedMetrics,
      filteredIssues,
      {
        detailLevel: 'detailed',
        reportFormat: 'markdown',
      }
    );

    // 11. Return successful response
    return NextResponse.json({
      success: true,
      data: {
        repository: analysisMetadata,
        report: {
          content: analysisResult.report.content,
          format: analysisResult.report.format,
        },
        validation: analysisResult.validation,
        tokenUsage: {
          totalTokens: analysisResult.tokenUsage?.totalTokens || 0,
          estimatedCost: analysisResult.tokenUsage?.estimatedCost || 0,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Analysis error:', error);

    // Handle specific GitHub API errors
    const errorWithStatus = error as { status?: number; message?: string; response?: { headers?: Record<string, string> } };
    if (errorWithStatus.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REPO_NOT_FOUND',
            message: 'Repository not found. Please check the repository name.',
          },
        },
        { status: 404 }
      );
    }

    if (errorWithStatus.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'GitHub API rate limit exceeded. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorWithStatus.message || 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? (error as { stack?: string }).stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}
