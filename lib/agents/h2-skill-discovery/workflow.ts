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
