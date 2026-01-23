/**
 * H2 Skill Discovery Workflow
 *
 * LangGraph pipeline: Query Translator → Scout → Screener
 */

import { StateGraph } from "@langchain/langgraph";
import { H2DiscoveryAnnotation, H2DiscoveryState } from "./state";
import { queryTranslatorNode } from "./query-translator";
import { scoutNode } from "./scout";
import { screenerNode } from "./screener";
import { H2EventEmitter } from "./events";

// Re-export H2EventEmitter for external use
export { H2EventEmitter } from "./events";
export type { H2Event, H2EventType, H2EventCallback } from "./events";

/**
 * Build the H2 Discovery LangGraph workflow
 */
export function buildH2DiscoveryGraph() {
  const graph = new StateGraph(H2DiscoveryAnnotation)
    .addNode("queryTranslator", queryTranslatorNode)
    .addNode("scout", scoutNode)
    .addNode("screener", screenerNode)
    .addEdge("__start__", "queryTranslator")
    .addEdge("queryTranslator", "scout")
    .addEdge("scout", "screener")
    .addEdge("screener", "__end__");

  return graph.compile();
}

/**
 * Execute H2 Discovery pipeline
 *
 * @param query - User search query
 * @param language - Optional language filter
 * @param toolType - Optional tool type filter
 * @returns Discovery results with scored repositories
 */
export async function executeH2Discovery(
  query: string,
  language?: string,
  toolType?: "cli" | "library" | "api-wrapper" | "any"
): Promise<H2DiscoveryState> {
  const graph = buildH2DiscoveryGraph();

  const initialState: Partial<H2DiscoveryState> = {
    query,
    language,
    toolType,
    stage: "translating",
    rawCandidates: [],
    scoredRepositories: [],
    errors: [],
    costTracking: {
      llmCalls: 0,
      tokensUsed: 0,
      estimatedCost: 0,
    },
  };

  console.log(`\n🚀 Starting H2 Skill Discovery for: "${query}"`);
  if (language) console.log(`   Language filter: ${language}`);
  if (toolType) console.log(`   Tool type filter: ${toolType}`);

  const startTime = Date.now();

  const result = await graph.invoke(initialState);

  const duration = Date.now() - startTime;
  console.log(`\n✅ Discovery completed in ${(duration / 1000).toFixed(2)}s`);
  console.log(`   Found ${result.scoredRepositories?.length || 0} suitable repositories`);
  console.log(
    `   Cost: $${result.costTracking?.estimatedCost.toFixed(4) || "0.0000"}`
  );

  if (result.errors && result.errors.length > 0) {
    console.log(`   ⚠️  Errors encountered: ${result.errors.length}`);
    result.errors.forEach((error) => console.log(`      - ${error}`));
  }

  return result as H2DiscoveryState;
}

/**
 * Execute H2 Discovery pipeline with event streaming
 *
 * @param query - User search query
 * @param emitter - Event emitter for progress updates
 * @param language - Optional language filter
 * @param toolType - Optional tool type filter
 * @returns Discovery results with scored repositories
 */
export async function executeH2DiscoveryWithEvents(
  query: string,
  emitter: H2EventEmitter,
  language?: string,
  toolType?: "cli" | "library" | "api-wrapper" | "any"
): Promise<H2DiscoveryState> {
  try {
    // Emit workflow start
    await emitter.emit('workflow:start', { query, language, toolType }, `Starting H2 Discovery for: "${query}"`);

    const initialState: Partial<H2DiscoveryState> = {
      query,
      language,
      toolType,
      stage: "translating",
      rawCandidates: [],
      scoredRepositories: [],
      errors: [],
      costTracking: {
        llmCalls: 0,
        tokensUsed: 0,
        estimatedCost: 0,
      },
    };

    const startTime = Date.now();
    let currentState = initialState as H2DiscoveryState;

    // Execute Query Translator
    await emitter.emit('translator:start', {}, 'Translating query to search parameters...');
    try {
      const translatorResult = await queryTranslatorNode(currentState);
      currentState = { ...currentState, ...translatorResult };
      await emitter.emit('translator:complete', { searchParams: translatorResult.searchParams }, 'Query translation complete');
    } catch (error) {
      await emitter.emit('translator:error', { error: (error as Error).message }, 'Query translation failed');
      throw error;
    }

    // Execute Scout
    await emitter.emit('scout:start', {}, 'Scouting GitHub repositories...');
    try {
      await emitter.emit('scout:searching', { strategy: 'multi-strategy' }, 'Searching with multiple strategies');
      const scoutResult = await scoutNode(currentState);
      currentState = { ...currentState, ...scoutResult };
      await emitter.emit('scout:complete', { count: scoutResult.rawCandidates?.length || 0 }, `Found ${scoutResult.rawCandidates?.length || 0} candidate repositories`);
    } catch (error) {
      await emitter.emit('scout:error', { error: (error as Error).message }, 'Scout search failed');
      throw error;
    }

    // Execute Screener
    await emitter.emit('screener:start', {}, 'Evaluating repositories with ACS scoring...');
    try {
      const totalCandidates = currentState.rawCandidates?.length || 0;
      if (currentState.rawCandidates) {
        for (let i = 0; i < totalCandidates; i++) {
          const repo = currentState.rawCandidates[i];
          if (repo) {
            await emitter.emit('screener:evaluating', { repo: repo.full_name, progress: i + 1, total: totalCandidates }, `Evaluating ${repo.full_name} (${i + 1}/${totalCandidates})`);
          }
        }
      }

      const screenerResult = await screenerNode(currentState);
      currentState = { ...currentState, ...screenerResult };
      await emitter.emit('screener:complete', { count: screenerResult.scoredRepositories?.length || 0 }, `Screening complete: ${screenerResult.scoredRepositories?.length || 0} suitable repositories`);
    } catch (error) {
      await emitter.emit('screener:error', { error: (error as Error).message }, 'Screening failed');
      throw error;
    }

    const duration = Date.now() - startTime;

    // Emit workflow complete
    await emitter.emit('workflow:complete', {
      duration,
      repositoryCount: currentState.scoredRepositories?.length || 0,
      cost: currentState.costTracking?.estimatedCost || 0
    }, `Discovery completed in ${(duration / 1000).toFixed(2)}s`);

    return currentState;
  } catch (error) {
    await emitter.emit('workflow:error', { error: (error as Error).message }, 'H2 Discovery workflow failed');
    throw error;
  }
}
