/**
 * Scout Node
 *
 * Executes 3 parallel GitHub search strategies and deduplicates results
 */

import { H2DiscoveryState, Repository } from "../state";
import {
  createGitHubClient,
  primarySearch,
  toolFocusedSearch,
  ecosystemSearch,
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
    const [primaryResults, toolResults, ecosystemResults] = await Promise.all([
      primarySearch(octokit, keywords),
      toolFocusedSearch(octokit, keywords, state.toolType),
      ecosystemSearch(octokit, keywords, state.language),
    ]);

    console.log(`  Primary: ${primaryResults.length} repos`);
    console.log(`  Tool-focused: ${toolResults.length} repos`);
    console.log(`  Ecosystem: ${ecosystemResults.length} repos`);

    // Merge and deduplicate
    const allResults = [...primaryResults, ...toolResults, ...ecosystemResults];
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
