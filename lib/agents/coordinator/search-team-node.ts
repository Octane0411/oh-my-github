/**
 * Search Team Node
 *
 * Wraps the existing h1-search-pipeline as a LangGraph subgraph.
 * This adapter layer transforms between AgentState and SearchPipelineState
 * without modifying the proven search pipeline code.
 *
 * Flow:
 * 1. Extract user query from AgentState
 * 2. Execute existing search pipeline
 * 3. Transform results to StructuredData.repo_list
 * 4. Update AgentState
 */

import { HumanMessage } from "@langchain/core/messages";
import type { AgentStateType } from "./state";
import { executeSearchPipeline } from "../h1-search-pipeline/workflow";
import type { SearchMode } from "../h1-search-pipeline/types";

/**
 * Default search mode
 * Can be made configurable later
 */
const DEFAULT_SEARCH_MODE: SearchMode = "balanced";

/**
 * Default timeout for search pipeline (90 seconds)
 */
const DEFAULT_TIMEOUT_MS = 90000;

/**
 * Search team node function
 *
 * @param state - Current agent state
 * @returns Partial state update with structured data
 */
export async function searchTeamNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();

  try {
    // Extract user query from messages
    const messages = state.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== "human") {
      throw new Error("No user message found in state");
    }

    const userQuery = (lastMessage as HumanMessage).content.toString();
    const conversationId = state.conversationId;

    console.log("[Search Team] Executing search pipeline...", {
      conversationId,
      query: userQuery.slice(0, 50),
      searchMode: DEFAULT_SEARCH_MODE,
    });

    // Execute existing search pipeline (unchanged code)
    const searchResult = await executeSearchPipeline(
      userQuery,
      DEFAULT_SEARCH_MODE,
      DEFAULT_TIMEOUT_MS,
      true // use cache
    );

    // Log execution
    const latency = Date.now() - startTime;
    console.log("[Search Team] Search completed", {
      conversationId,
      resultsCount: searchResult.topRepos?.length || 0,
      totalCandidates: searchResult.candidateRepos?.length || 0,
      cached: searchResult.cached || false,
      latency: `${latency}ms`,
    });

    // Transform search results to StructuredData
    const structuredData = {
      type: "repo_list" as const,
      items: searchResult.topRepos || [],
      totalCandidates: searchResult.candidateRepos?.length,
      searchMode: DEFAULT_SEARCH_MODE,
    };

    // Update state
    return {
      structuredData,
      metadata: {
        ...state.metadata,
        searchTeamLatency: latency,
        searchResult: {
          cached: searchResult.cached,
          executionTime: searchResult.executionTime,
          warnings: searchResult.warnings,
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Search Team] Error:", {
      conversationId: state.conversationId,
      error: errorMessage,
    });

    // Return error state
    return {
      structuredData: null,
      error: errorMessage,
      metadata: {
        ...state.metadata,
        searchTeamError: errorMessage,
      },
    };
  }
}
