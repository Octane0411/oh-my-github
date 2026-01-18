/**
 * LangGraph Workflow for Horizon 1 Search Pipeline
 *
 * Sequential flow: Query Translator → Scout → Screener → Results
 *
 * This workflow orchestrates the three main agents:
 * 1. Query Translator: Natural language → structured search parameters
 * 2. Scout: Multi-strategy GitHub search → candidate repositories
 * 3. Screener: Two-stage filtering → Top 10 scored repositories
 */

import { StateGraph, Annotation } from "@langchain/langgraph";
import type { SearchPipelineState } from "./types";
import { queryTranslatorNode } from "./query-translator";
import { scoutNode } from "./scout";
import { screenerNode } from "./screener";
import { getCachedResult, setCachedResult } from "./cache";

/**
 * LangGraph State Annotation
 *
 * Defines the shape of the state that flows through the graph.
 * LangGraph uses this to track changes and manage state transitions.
 */
const SearchPipelineAnnotation = Annotation.Root({
  // Input
  userQuery: Annotation<string>,
  searchMode: Annotation<"focused" | "balanced" | "exploratory">,

  // Intermediate states
  searchParams: Annotation<SearchPipelineState["searchParams"]>,
  candidateRepos: Annotation<SearchPipelineState["candidateRepos"]>,
  coarseFilteredRepos: Annotation<SearchPipelineState["coarseFilteredRepos"]>,

  // Output
  topRepos: Annotation<SearchPipelineState["topRepos"]>,

  // Metadata
  executionTime: Annotation<SearchPipelineState["executionTime"]>,
  errors: Annotation<SearchPipelineState["errors"]>,
  warnings: Annotation<SearchPipelineState["warnings"]>,
  cached: Annotation<SearchPipelineState["cached"]>,
});

/**
 * Creates and compiles the search pipeline workflow
 *
 * @returns Compiled StateGraph ready for invocation
 */
export function createSearchPipelineWorkflow() {
  // Initialize the state graph
  const workflow = new StateGraph(SearchPipelineAnnotation);

  // Phase 1-3: Add Query Translator, Scout, and Screener nodes
  workflow.addNode("query_translator", queryTranslatorNode);
  workflow.addNode("scout", scoutNode);
  workflow.addNode("screener", screenerNode);

  // Define edges (Phase 1-3: Query Translator → Scout → Screener)
  workflow.setEntryPoint("query_translator");
  workflow.addEdge("query_translator", "scout");
  workflow.addEdge("scout", "screener");
  workflow.setFinishPoint("screener");

  // Compile the workflow
  const app = workflow.compile();

  return app;
}

/**
 * Execute the search pipeline with a user query
 *
 * @param userQuery - Natural language search query
 * @param searchMode - Search mode (focused/balanced/exploratory)
 * @param timeoutMs - Maximum execution time in milliseconds (default: 90000ms = 90s)
 * @param useCache - Whether to use cache (default: true)
 * @returns Final state with Top 10 repositories
 */
export async function executeSearchPipeline(
  userQuery: string,
  searchMode: SearchPipelineState["searchMode"] = "balanced",
  timeoutMs: number = 90000,
  useCache: boolean = true
): Promise<SearchPipelineState> {
  const startTime = Date.now();

  // Check cache first
  if (useCache) {
    const cached = getCachedResult(userQuery, searchMode);
    if (cached) {
      return cached;
    }
  }

  // Initialize state
  const initialState: Partial<SearchPipelineState> = {
    userQuery,
    searchMode,
    executionTime: {},
    errors: [],
    warnings: [],
  };

  try {
    // Create workflow
    const app = createSearchPipelineWorkflow();

    // Execute with timeout
    const result = await Promise.race([
      app.invoke(initialState),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Search pipeline timed out")), timeoutMs)
      ),
    ]);

    // Calculate total execution time
    const totalTime = Date.now() - startTime;
    result.executionTime.total = totalTime;

    const finalResult = result as SearchPipelineState;

    // Cache successful results
    if (useCache && finalResult.topRepos && finalResult.topRepos.length > 0) {
      setCachedResult(userQuery, searchMode, finalResult);
    }

    return finalResult;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;

    // Check if it was a timeout
    if (error instanceof Error && error.message.includes("timed out")) {
      throw new Error(
        `Search pipeline timed out after ${elapsedTime}ms (limit: ${timeoutMs}ms). Try a more specific query.`
      );
    }

    // Handle other pipeline failures
    throw new Error(
      `Search pipeline failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
