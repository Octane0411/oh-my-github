import { NextResponse } from "next/server";
import { executeSearchPipeline } from "@/lib/agents/h1-search-pipeline/workflow";
import type { SearchPipelineState } from "@/lib/agents/h1-search-pipeline/types";

/**
 * Search API Request Body
 */
interface SearchRequest {
  query: string;
  mode?: "focused" | "balanced" | "exploratory";
}

/**
 * Search API Response
 */
interface SearchResponse {
  success: boolean;
  data?: {
    query: string;
    mode: string;
    results: SearchPipelineState["topRepos"];
    metadata: {
      totalCandidates: number;
      coarseFiltered: number;
      topRepos: number;
      executionTime: SearchPipelineState["executionTime"];
    };
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * POST /api/search
 *
 * Search for GitHub repositories using natural language queries
 *
 * Request body:
 * - query: Natural language search query (required)
 * - mode: Search mode - "focused" | "balanced" | "exploratory" (optional, default: "balanced")
 *
 * Response:
 * - success: Boolean indicating if search was successful
 * - data: Search results with metadata
 * - error: Error details if search failed
 */
export async function POST(request: Request): Promise<NextResponse<SearchResponse>> {
  try {
    // 1. Validate environment variables
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_ENV_VAR",
            message: "GITHUB_TOKEN environment variable is not configured",
          },
        },
        { status: 500 }
      );
    }

    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_ENV_VAR",
            message: "DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable is required for LLM evaluation",
          },
        },
        { status: 500 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json() as SearchRequest;
    const { query, mode = "balanced" } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_QUERY",
            message: "Query is required and must be a non-empty string",
          },
        },
        { status: 400 }
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "QUERY_TOO_LONG",
            message: "Query must be 200 characters or less",
          },
        },
        { status: 400 }
      );
    }

    if (mode && !["focused", "balanced", "exploratory"].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MODE",
            message: 'Mode must be one of: "focused", "balanced", "exploratory"',
          },
        },
        { status: 400 }
      );
    }

    // 3. Execute search pipeline
    console.log(`[API] Search request: "${query}" (mode: ${mode})`);
    const result = await executeSearchPipeline(query, mode);

    // 4. Check if we got results
    if (!result.topRepos || result.topRepos.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            query,
            mode,
            results: [],
            metadata: {
              totalCandidates: result.candidateRepos?.length || 0,
              coarseFiltered: result.coarseFilteredRepos?.length || 0,
              topRepos: 0,
              executionTime: result.executionTime,
            },
          },
        },
        { status: 200 }
      );
    }

    // 5. Return successful response
    console.log(`[API] Search completed: ${result.topRepos.length} results in ${result.executionTime.total}ms`);
    return NextResponse.json({
      success: true,
      data: {
        query,
        mode,
        results: result.topRepos,
        metadata: {
          totalCandidates: result.candidateRepos?.length || 0,
          coarseFiltered: result.coarseFilteredRepos?.length || 0,
          topRepos: result.topRepos.length,
          executionTime: result.executionTime,
        },
      },
    });
  } catch (error: unknown) {
    console.error("[API] Search error:", error);

    // Handle specific errors
    const errorWithMessage = error as { message?: string; code?: string; stack?: string };

    // Query translation failure
    if (errorWithMessage.message?.includes("Query translation failed")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "QUERY_TRANSLATION_ERROR",
            message: "Failed to translate query. Please try rephrasing your search.",
            details: process.env.NODE_ENV === "development" ? errorWithMessage.message : undefined,
          },
        },
        { status: 400 }
      );
    }

    // GitHub API rate limit
    if (errorWithMessage.message?.includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT",
            message: "GitHub API rate limit exceeded. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    // Timeout
    if (errorWithMessage.message?.includes("timeout") || errorWithMessage.message?.includes("timed out")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TIMEOUT",
            message: "Search request timed out. Please try a more specific query.",
          },
        },
        { status: 504 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during search",
          details: process.env.NODE_ENV === "development" ? errorWithMessage.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}
