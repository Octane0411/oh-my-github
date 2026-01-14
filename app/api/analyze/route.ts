import { NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/github/client';
import { extractRepoMetadata } from '@/lib/github/metadata';
import { analyzeRepository } from '@/lib/analysis';

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

    // 3. Create GitHub client
    const githubClient = createGitHubClient(process.env.GITHUB_TOKEN);

    // 4. Extract repository metadata
    const metadata = await extractRepoMetadata(githubClient, { owner, name });

    // 5. Run LLM analysis
    const analysisResult = await analyzeRepository(
      metadata.repositoryMetadata,
      metadata.calculatedMetrics,
      metadata.filteredIssues,
      {
        detailLevel: 'detailed',
        reportFormat: 'markdown',
      }
    );

    // 6. Return successful response
    return NextResponse.json({
      success: true,
      data: {
        repository: metadata.repositoryMetadata,
        report: {
          content: analysisResult.report,
          format: 'markdown',
        },
        validation: analysisResult.validation,
        tokenUsage: {
          totalTokens: analysisResult.tokenUsage?.totalTokens || 0,
          estimatedCost: analysisResult.tokenUsage?.estimatedCost || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Analysis error:', error);

    // Handle specific GitHub API errors
    if (error.status === 404) {
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

    if (error.status === 403) {
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
          message: error.message || 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}
