/**
 * Tool Executor with Event Streaming
 *
 * Executes consultant tools with real-time progress events
 */

import { executeH2DiscoveryWithEvents, H2EventEmitter } from "@/lib/agents/h2-skill-discovery";
import type { FindRepositoryParams, GenerateSkillParams } from "./tools";

export interface ToolEvent {
  type: 'log' | 'progress' | 'result' | 'error';
  tool: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

export interface FindRepositoryResult {
  success: boolean;
  repositories: Array<{
    rank: number;
    isTopChoice: boolean;
    fullName: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
    acsScore: {
      total: number;
      interface: number;
      documentation: number;
      complexity: number;
    };
    recommendation: string;
    skillStrategy: string;
    reasoningText: string;
  }>;
  summary: string;
  cost?: number;
}

export interface GenerateSkillResult {
  success: boolean;
  status: string;
  message: string;
  details?: string[];
  repoUrl?: string;
}

export type ToolEventCallback = (event: ToolEvent) => void;

/**
 * Execute findRepository with event streaming
 */
export async function executeFindRepositoryWithEvents(
  params: FindRepositoryParams,
  onEvent: ToolEventCallback
): Promise<FindRepositoryResult> {
  const h2Emitter = new H2EventEmitter();

  // Subscribe to H2 events and forward them
  h2Emitter.on(async (h2Event) => {
    // Map H2 events to tool events
    let message = h2Event.message || '';
    let type: 'log' | 'progress' = 'log';

    switch (h2Event.type) {
      case 'workflow:start':
        message = `🚀 Starting H2 Discovery for: "${params.query}"`;
        break;
      case 'translator:start':
        message = '🔤 Translating query to search parameters...';
        break;
      case 'translator:complete':
        message = '✅ Query translation complete';
        break;
      case 'scout:start':
        message = '🔍 Scouting GitHub repositories...';
        break;
      case 'scout:searching': {
        const data = h2Event.data as { strategy?: string } | undefined;
        message = `🔎 Searching with ${data?.strategy || 'multi-strategy'} approach`;
        type = 'progress';
        break;
      }
      case 'scout:complete': {
        const data = h2Event.data as { count?: number } | undefined;
        message = `✅ Found ${data?.count || 0} candidate repositories`;
        break;
      }
      case 'screener:start':
        message = '📊 Evaluating repositories with ACS scoring...';
        break;
      case 'screener:evaluating': {
        const data = h2Event.data as { repo?: string; progress?: number; total?: number } | undefined;
        message = `📈 Evaluating ${data?.repo || 'repository'} (${data?.progress || 0}/${data?.total || 0})`;
        type = 'progress';
        break;
      }
      case 'screener:complete': {
        const data = h2Event.data as { count?: number } | undefined;
        message = `✅ Screening complete: ${data?.count || 0} suitable repositories`;
        break;
      }
      case 'workflow:complete': {
        const data = h2Event.data as { duration?: number } | undefined;
        message = `🎉 Discovery completed in ${((data?.duration || 0) / 1000).toFixed(2)}s`;
        break;
      }
      case 'workflow:error':
      case 'translator:error':
      case 'scout:error':
      case 'screener:error':
        onEvent({
          type: 'error',
          tool: 'findRepository',
          message: message || 'An error occurred',
          data: h2Event.data,
          timestamp: h2Event.timestamp,
        });
        return;
    }

    onEvent({
      type,
      tool: 'findRepository',
      message,
      data: h2Event.data,
      timestamp: h2Event.timestamp,
    });
  });

  try {
    // Execute H2 Discovery with events
    const result = await executeH2DiscoveryWithEvents(
      params.query,
      h2Emitter,
      params.language,
      params.toolType
    );

    // Format top 5 results
    const top5 = result.scoredRepositories?.slice(0, 5) || [];

    if (top5.length === 0) {
      const noResultsData = {
        success: false,
        repositories: [],
        summary: `No suitable repositories found for "${params.query}". Try refining your search.`,
      };

      onEvent({
        type: 'result',
        tool: 'findRepository',
        message: 'Search completed with no results',
        data: noResultsData,
        timestamp: Date.now(),
      });

      return noResultsData;
    }

    // Build result with rich context for LLM
    const topRepo = top5[0]!;
    const scoreGap = top5.length > 1 ? topRepo.acsScore.total - top5[1]!.acsScore.total : 100;
    const showAlternatives = scoreGap < 15;

    const resultData = {
      success: true,
      repositories: top5.map((scored, index) => ({
        rank: index + 1,
        isTopChoice: index === 0,
        fullName: scored.repo.full_name,
        description: scored.repo.description,
        stars: scored.repo.stars,
        language: scored.repo.language,
        url: scored.repo.html_url,
        acsScore: {
          total: scored.acsScore.total,
          interface: scored.acsScore.breakdown.interface_clarity,
          documentation: scored.acsScore.breakdown.documentation,
          complexity: scored.acsScore.breakdown.token_economy,
        },
        recommendation: scored.acsScore.recommendation,
        skillStrategy: scored.acsScore.skill_strategy,
        reasoningText: scored.reasoningText,
      })),
      summary: `Found ${top5.length} repositories ranked by ACS score (Interface Clarity, Documentation, Environment, Token Economy).

🎯 TOP RECOMMENDATION:
${topRepo.repo.full_name} (⭐ ${topRepo.repo.stars}, ACS: ${topRepo.acsScore.total}/100)
${topRepo.repo.description || 'No description'}

ACS Breakdown:
- Interface Clarity: ${topRepo.acsScore.breakdown.interface_clarity}/100
- Documentation: ${topRepo.acsScore.breakdown.documentation}/100
- Token Economy: ${topRepo.acsScore.breakdown.token_economy}/100

YOUR TASK: Analyze which ACS dimension(s) make this the best choice for the user's specific query. Explain in 2-3 sentences why this repo excels at the dimension most relevant to their need.

${showAlternatives && top5.length > 1 ? `
📋 ALTERNATIVES (score gap < 15 points):
${top5
        .slice(1)
        .map(
          (r, i) =>
            `${i + 2}. ${r.repo.full_name} (⭐ ${r.repo.stars}, ACS: ${r.acsScore.total}/100)
   ACS: Interface ${r.acsScore.breakdown.interface_clarity}, Docs ${r.acsScore.breakdown.documentation}, Token Economy ${r.acsScore.breakdown.token_economy}
   ${r.repo.description || 'No description'}`
        )
        .join("\n\n")}

YOUR TASK: For each alternative, identify which ACS dimension it excels at compared to the top choice. Phrase as "Choose this if you need [specific dimension benefit]".` :
scoreGap >= 15 ? `
✅ CLEAR WINNER (score gap: ${scoreGap.toFixed(1)} points)
Focus on presenting the top recommendation. Alternatives are significantly weaker, so don't present them unless the user specifically asks.` : ''}

CRITICAL INSTRUCTIONS:
1. Lead with ONE clear recommendation
2. Explain WHY using the specific ACS dimension(s) that match the user's query
3. For alternatives (if shown), differentiate by ACS dimensions - not generic "also good"
4. Reference the numerical scores above when explaining trade-offs`,
      cost: result.costTracking?.estimatedCost || 0,
    };

    onEvent({
      type: 'result',
      tool: 'findRepository',
      message: 'Search completed successfully',
      data: resultData,
      timestamp: Date.now(),
    });

    return resultData;
  } catch (error) {
    const errorMessage = `Search failed: ${(error as Error).message}`;

    onEvent({
      type: 'error',
      tool: 'findRepository',
      message: errorMessage,
      data: { error: (error as Error).message },
      timestamp: Date.now(),
    });

    return {
      success: false,
      repositories: [],
      summary: errorMessage,
    };
  }
}

/**
 * Execute generateSkill with event streaming (Phase 7 stub)
 */
export async function executeGenerateSkillWithEvents(
  params: GenerateSkillParams,
  onEvent: ToolEventCallback
): Promise<GenerateSkillResult> {
  // Validate GitHub URL format
  const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/?$/;
  if (!githubUrlPattern.test(params.repoUrl)) {
    const errorData = {
      success: false,
      status: "error",
      message: "Invalid GitHub URL format. Must be https://github.com/owner/repo",
    };

    onEvent({
      type: 'error',
      tool: 'generateSkill',
      message: errorData.message,
      data: errorData,
      timestamp: Date.now(),
    });

    return errorData;
  }

  // Phase 7 stub - emit progress events
  onEvent({
    type: 'log',
    tool: 'generateSkill',
    message: '🔧 Skill Fabricator initialized',
    timestamp: Date.now(),
  });

  onEvent({
    type: 'log',
    tool: 'generateSkill',
    message: '📦 Phase 7: Skill generation pipeline',
    timestamp: Date.now(),
  });

  onEvent({
    type: 'log',
    tool: 'generateSkill',
    message: '⏳ Coming soon - stay tuned!',
    timestamp: Date.now(),
  });

  const stubResult = {
    success: false,
    status: "pending",
    message: "Fabrication pipeline not yet implemented (Phase 7)",
    details: [
      "Phase 7 will integrate Claude Skill-Creator",
      "Automatic skill packaging and download",
      "Expected timeline: After Phase 6 completion"
    ],
    repoUrl: params.repoUrl,
  };

  onEvent({
    type: 'result',
    tool: 'generateSkill',
    message: 'Phase 7 stub response',
    data: stubResult,
    timestamp: Date.now(),
  });

  return stubResult;
}
