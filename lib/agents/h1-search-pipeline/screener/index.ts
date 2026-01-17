/**
 * Screener Agent
 *
 * Two-stage filtering to select Top 10 repositories:
 * - Stage 1 (Coarse Filter): Rule-based filtering 50-100 → ~25
 * - Stage 2 (Fine Scoring): LLM-based scoring + ranking → Top 10
 *
 * Phase 3 implements Stage 1 only.
 * Stage 2 will be added in Phase 4-5.
 */

import type { Repository, ScoredRepository } from "../types";
import {
  applyCoarseFilter,
  DEFAULT_COARSE_FILTER_CONFIG,
  type CoarseFilterConfig,
} from "./coarse-filter";

/**
 * Screener Agent: Filter and rank repositories
 *
 * Phase 3: Stage 1 only (coarse filter)
 * Phase 4-5: Add Stage 2 (fine scoring)
 *
 * @param candidates - Candidate repositories from Scout
 * @param userQuery - Original user query (for Stage 2 relevance scoring)
 * @param config - Optional filter configuration
 * @returns Coarse-filtered repositories (Stage 1 only for now)
 */
export async function screenRepositories(
  candidates: Repository[],
  userQuery: string,
  config: CoarseFilterConfig = DEFAULT_COARSE_FILTER_CONFIG
): Promise<{
  coarseFiltered: Repository[];
  topRepos?: ScoredRepository[]; // Will be populated in Phase 4-5
}> {
  console.log(`\n🎯 Screener: Processing ${candidates.length} candidates...`);

  // Stage 1: Coarse Filter (Phase 3)
  const coarseFiltered = applyCoarseFilter(candidates, config);

  console.log(
    `\n✅ Screener Stage 1 complete: ${coarseFiltered.length} repos passed`
  );

  // TODO Phase 4-5: Stage 2 - Fine Scoring
  // - Fetch README previews
  // - Call LLM for Documentation + Ease of Use scores
  // - Calculate metadata-based scores (Maturity, Activity, Community, Maintenance)
  // - Aggregate overall scores
  // - Sort and return Top 10

  return {
    coarseFiltered,
    topRepos: undefined, // Will be implemented in Phase 4-5
  };
}

/**
 * Screener node for LangGraph workflow
 */
export async function screenerNode(state: {
  candidateRepos?: Repository[];
  userQuery: string;
  executionTime: Record<string, number>;
}): Promise<{
  coarseFilteredRepos: Repository[];
  topRepos?: ScoredRepository[];
  executionTime: Record<string, number>;
}> {
  if (!state.candidateRepos) {
    throw new Error("candidateRepos is required for Screener agent");
  }

  const startTime = Date.now();

  const result = await screenRepositories(
    state.candidateRepos,
    state.userQuery
  );

  const executionTime = {
    ...state.executionTime,
    screenerStage1: Date.now() - startTime,
  };

  return {
    coarseFilteredRepos: result.coarseFiltered,
    topRepos: result.topRepos,
    executionTime,
  };
}
