/**
 * Screener Agent
 *
 * Two-stage filtering to select Top 10 repositories:
 * - Stage 1 (Coarse Filter): Rule-based filtering 50-100 -> ~25
 * - Stage 2 (Fine Scoring): Multi-dimensional scoring + ranking -> Top 10
 */

import type { Repository, ScoredRepository } from "../types";
import {
  applyCoarseFilter,
  DEFAULT_COARSE_FILTER_CONFIG,
  type CoarseFilterConfig,
} from "./coarse-filter";
import { applyFineScoring } from "./fine-scoring";

/** Result from screening repositories */
interface ScreeningResult {
  coarseFiltered: Repository[];
  topRepos: ScoredRepository[];
}

/**
 * Screen and rank repositories through two-stage filtering
 *
 * @param candidates - Candidate repositories from Scout (50-100)
 * @param userQuery - Original user query for relevance scoring
 * @param config - Optional coarse filter configuration
 * @returns Filtered repositories and top 10 scored results
 */
export async function screenRepositories(
  candidates: Repository[],
  userQuery: string,
  config: CoarseFilterConfig = DEFAULT_COARSE_FILTER_CONFIG
): Promise<ScreeningResult> {
  console.log(`\n[Screener] Processing ${candidates.length} candidates...`);

  const coarseFiltered = applyCoarseFilter(candidates, config);
  console.log(`[Screener Stage 1] ${coarseFiltered.length} repos passed coarse filter`);

  const topRepos = await applyFineScoring(coarseFiltered, userQuery);

  return { coarseFiltered, topRepos };
}

/** Input state for screener node */
interface ScreenerNodeInput {
  candidateRepos?: Repository[];
  userQuery: string;
  executionTime: Record<string, number>;
}

/** Output state from screener node */
interface ScreenerNodeOutput {
  coarseFilteredRepos: Repository[];
  topRepos: ScoredRepository[];
  executionTime: Record<string, number>;
}

/**
 * Screener node for LangGraph workflow
 */
export async function screenerNode(state: ScreenerNodeInput): Promise<ScreenerNodeOutput> {
  if (!state.candidateRepos) {
    throw new Error("candidateRepos is required for Screener agent");
  }

  const startTime = Date.now();
  const result = await screenRepositories(state.candidateRepos, state.userQuery);
  const screenerTime = Date.now() - startTime;

  return {
    coarseFilteredRepos: result.coarseFiltered,
    topRepos: result.topRepos,
    executionTime: { ...state.executionTime, screener: screenerTime },
  };
}
