/**
 * Scout Node
 *
 * Executes 3 parallel GitHub search strategies and deduplicates results
 * 
 * Strategy 1: All-time Best - Global popular tools
 * Strategy 2: Recent Rising - New tools (2024+)
 * Strategy 3: LLM-Guided - Classic well-known tools
 */

import { H2DiscoveryState, Repository } from "../state";
import {
  createGitHubClient,
  allTimeBestSearch,
  recentRisingSearch,
  llmGuidedSearch,
} from "./strategies";

/**
 * Deduplicate repositories by full_name
 */
function deduplicateRepositories(repos: Repository[]): Repository[] {
  const seen = new Set<string>();
  const deduplicated: Repository[] = [];

  for (const repo of repos) {
    if (!seen.has(repo.full_name)) {
      seen.add(repo.full_name);
      deduplicated.push(repo);
    }
  }

  return deduplicated;
}

/**
 * Filter out archived repos and trivial forks
 */
function filterRepositories(repos: Repository[]): Repository[] {
  return repos.filter((repo) => {
    // Remove archived repositories
    if (repo.archived) {
      return false;
    }

    // Remove trivial forks (forks with < 100 stars)
    if (repo.fork && repo.stars < 100) {
      return false;
    }

    return true;
  });
}

/**
 * Scout LangGraph Node
 */
export async function scoutNode(
  state: H2DiscoveryState
): Promise<Partial<H2DiscoveryState>> {
  if (!state.searchParams) {
    return {
      stage: "screening",
      rawCandidates: [],
      errors: [
        ...(state.errors || []),
        "Scout failed: Missing search parameters",
      ],
    };
  }

  const octokit = createGitHubClient();
  const { keywords } = state.searchParams;

  try {
    console.log("🔍 Executing Scout strategies in parallel...");

    // Execute 3 strategies in parallel
    const [allTimeResults, recentResults, llmResults] = await Promise.all([
      allTimeBestSearch(octokit, keywords, state.language),
      recentRisingSearch(octokit, keywords, state.language),
      llmGuidedSearch(octokit, keywords, state.language),
    ]);

    console.log(`  All-time Best: ${allTimeResults.length} repos`);
    console.log(`  Recent Rising (2024+): ${recentResults.length} repos`);
    console.log(`  LLM-guided: ${llmResults.length} repos`);

    // Merge and deduplicate
    const allResults = [...allTimeResults, ...recentResults, ...llmResults];
    const uniqueResults = deduplicateRepositories(allResults);
    const filteredResults = filterRepositories(uniqueResults);

    console.log(
      `  Total: ${filteredResults.length} unique candidates (after filtering)`
    );

    return {
      rawCandidates: filteredResults,
      stage: "screening",
    };
  } catch (error) {
    console.error("Scout error:", error);

    return {
      stage: "screening",
      rawCandidates: [],
      errors: [
        ...(state.errors || []),
        `Scout failed: ${(error as Error).message}`,
      ],
    };
  }
}
