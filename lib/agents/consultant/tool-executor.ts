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
  data?: any;
  timestamp: number;
}

export type ToolEventCallback = (event: ToolEvent) => void;

/**
 * Execute findRepository with event streaming
 */
export async function executeFindRepositoryWithEvents(
  params: FindRepositoryParams,
  onEvent: ToolEventCallback
): Promise<any> {
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
      case 'scout:searching':
        message = `🔎 Searching with ${h2Event.data?.strategy || 'multi-strategy'} approach`;
        type = 'progress';
        break;
      case 'scout:complete':
        message = `✅ Found ${h2Event.data?.count || 0} candidate repositories`;
        break;
      case 'screener:start':
        message = '📊 Evaluating repositories with ACS scoring...';
        break;
      case 'screener:evaluating':
        message = `📈 Evaluating ${h2Event.data?.repo || 'repository'} (${h2Event.data?.progress || 0}/${h2Event.data?.total || 0})`;
        type = 'progress';
        break;
      case 'screener:complete':
        message = `✅ Screening complete: ${h2Event.data?.count || 0} suitable repositories`;
        break;
      case 'workflow:complete':
        message = `🎉 Discovery completed in ${((h2Event.data?.duration || 0) / 1000).toFixed(2)}s`;
        break;
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

    // Build result
    const resultData = {
      success: true,
      repositories: top5.map((scored) => ({
        fullName: scored.repo.full_name,
        description: scored.repo.description,
        stars: scored.repo.stars,
        language: scored.repo.language,
        url: scored.repo.html_url,
        acsScore: scored.acsScore.total,
        interface: scored.acsScore.breakdown.interface_clarity,
        documentation: scored.acsScore.breakdown.documentation,
        complexity: scored.acsScore.breakdown.token_economy,
        recommendation: scored.acsScore.recommendation,
        skillStrategy: scored.acsScore.skill_strategy,
        reasoning: scored.reasoning,
      })),
      summary: `Found ${top5.length} repositories:\n${top5
        .map(
          (r, i) =>
            `${i + 1}. ${r.repo.full_name} (ACS: ${r.acsScore.total}/100 - ${r.acsScore.recommendation})`
        )
        .join("\n")}`,
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
): Promise<any> {
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
