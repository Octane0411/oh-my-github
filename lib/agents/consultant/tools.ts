/**
 * Consultant Agent Tools
 *
 * Defines tools for H2 Skill Discovery and Skill Generation
 */

import { executeH2Discovery } from "@/lib/agents/h2-skill-discovery/workflow";

export interface FindRepositoryParams {
  query: string;
  language?: string;
  toolType?: "cli" | "library" | "api-wrapper" | "any";
}

export interface GenerateSkillParams {
  repoUrl: string;
}

/**
 * findRepository Tool
 *
 * Searches GitHub for tools/libraries suitable for Agent Skills
 */
export async function findRepository(params: FindRepositoryParams) {
  try {
    console.log(`[findRepository] Executing discovery for: "${params.query}"`);

    // Execute H2 Discovery pipeline
    const result = await executeH2Discovery(params.query, params.language, params.toolType);

    // Format top 5 results
    const top5 = result.scoredRepositories.slice(0, 5);

    if (top5.length === 0) {
      return {
        success: false,
        repositories: [],
        summary: `No suitable repositories found for "${params.query}". Try refining your search with more specific keywords or different language filters.`,
      };
    }

    // Build summary
    const summary = `Found ${top5.length} repositories:\n${top5
      .map(
        (r, i) =>
          `${i + 1}. ${r.repo.full_name} (ACS: ${r.acsScore.total}/100 - ${r.acsScore.recommendation})`
      )
      .join("\n")}`;

    return {
      success: true,
      repositories: top5.map((scored) => ({
        fullName: scored.repo.full_name,
        description: scored.repo.description,
        stars: scored.repo.stars,
        language: scored.repo.language,
        url: scored.repo.html_url,
        acsScore: scored.acsScore.total,
        recommendation: scored.acsScore.recommendation,
        skillStrategy: scored.acsScore.skill_strategy,
        reasoning: scored.reasoning,
      })),
      summary,
      cost: result.costTracking?.estimatedCost || 0,
    };
  } catch (error) {
    console.error("[findRepository] Error:", error);
    return {
      success: false,
      repositories: [],
      summary: `Search failed: ${(error as Error).message}`,
    };
  }
}

/**
 * generateSkill Tool
 *
 * Converts a GitHub repository into an Agent Skill (Phase 7 stub)
 */
export async function generateSkill(params: GenerateSkillParams) {
  console.log(`[generateSkill] Request to generate skill from: ${params.repoUrl}`);

  // Validate GitHub URL format
  const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/?$/;
  if (!githubUrlPattern.test(params.repoUrl)) {
    return {
      success: false,
      status: "error",
      message: "Invalid GitHub URL format. Must be https://github.com/owner/repo",
    };
  }

  // Phase 7 stub - not yet implemented
  return {
    success: false,
    status: "pending",
    message: "Fabrication pipeline not yet implemented (Phase 7). This feature will automatically convert repositories into Claude Skills.",
    repoUrl: params.repoUrl,
  };
}
