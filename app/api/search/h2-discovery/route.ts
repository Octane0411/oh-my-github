/**
 * POST /api/search/h2-discovery - Direct H2 Discovery endpoint
 *
 * Executes H2 Skill Discovery pipeline without consultant layer
 *
 * Request body:
 * ```json
 * {
 *   "query": "Python PDF table extraction",
 *   "language": "python",  // optional
 *   "toolType": "library"  // optional: "cli" | "library" | "api-wrapper" | "any"
 * }
 * ```
 */

import { executeH2Discovery } from "@/lib/agents/h2-skill-discovery/workflow";

export const runtime = "edge";

/**
 * POST handler for h2-discovery endpoint
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { query, language, toolType } = body;

    // Validate query
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "Query is required and must be a string",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate toolType if provided
    if (toolType && !["cli", "library", "api-wrapper", "any"].includes(toolType)) {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_ERROR",
          message: 'toolType must be one of: "cli", "library", "api-wrapper", "any"',
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("[API /search/h2-discovery] Request received", {
      query,
      language,
      toolType,
    });

    // Execute H2 Discovery
    const startTime = Date.now();
    const result = await executeH2Discovery(query, language, toolType);
    const duration = Date.now() - startTime;

    console.log("[API /search/h2-discovery] Request completed", {
      duration: `${duration}ms`,
      repositoriesFound: result.scoredRepositories.length,
      errors: result.errors?.length || 0,
    });

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        query,
        repositories: result.scoredRepositories.map((scored) => ({
          fullName: scored.repo.full_name,
          description: scored.repo.description,
          stars: scored.repo.stars,
          language: scored.repo.language,
          url: scored.repo.html_url,
          acsScore: scored.acsScore.total,
          recommendation: scored.acsScore.recommendation,
          skillStrategy: scored.acsScore.skill_strategy,
          reasoningText: scored.reasoningText,
          breakdown: scored.acsScore.breakdown,
        })),
        metadata: {
          stage: result.stage,
          duration,
          cost: result.costTracking?.estimatedCost || 0,
          llmCalls: result.costTracking?.llmCalls || 0,
          tokensUsed: result.costTracking?.tokensUsed || 0,
          errors: result.errors || [],
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /search/h2-discovery] Request error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
