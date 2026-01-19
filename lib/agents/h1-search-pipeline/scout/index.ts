/**
 * Scout Agent
 *
 * Multi-strategy GitHub repository search to find 50-100 candidates.
 *
 * Strategies:
 * 1. Search by Stars (popularity-based)
 * 2. Search by Recency (recently updated)
 * 3. Search by Expanded Keywords (semantic relevance)
 *
 * All strategies run in parallel and results are deduplicated.
 */

import { Octokit } from "@octokit/rest";
import type { Repository, SearchParams } from "../types";
import { CONFIG } from "../types";

/**
 * Create authenticated Octokit client
 */
function createGitHubClient(): Octokit {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "Missing GITHUB_TOKEN environment variable. Get one at: https://github.com/settings/tokens"
    );
  }

  return new Octokit({ auth: token });
}

type SearchStrategy = "stars" | "recency" | "expanded";

/**
 * Calculate the minimum star threshold for a given strategy
 *
 * Stars strategy uses the original range, while recency and expanded
 * strategies use lower thresholds to discover different types of projects.
 */
function calculateMinStars(
  strategy: SearchStrategy,
  starRange: { min?: number; max?: number }
): { min: number; max?: number } {
  const min = starRange.min ?? 0;

  switch (strategy) {
    case "recency":
      return {
        min: Math.max(
          CONFIG.SCOUT.RECENCY_MIN_FLOOR,
          Math.floor(min / CONFIG.SCOUT.RECENCY_STAR_DIVISOR)
        ),
      };
    case "expanded":
      return {
        min: Math.max(
          CONFIG.SCOUT.EXPANDED_MIN_FLOOR,
          Math.floor(min / CONFIG.SCOUT.EXPANDED_STAR_DIVISOR)
        ),
      };
    case "stars":
    default:
      return { min, max: starRange.max };
  }
}

/**
 * Build the star range query fragment for GitHub search
 */
function buildStarRangeQuery(min: number, max?: number): string {
  if (max !== undefined) {
    return `stars:${min}..${max}`;
  }
  return `stars:>=${min}`;
}

/**
 * Build GitHub search query string from search parameters
 *
 * @param params - Search parameters from Query Translator
 * @param strategy - Search strategy to use
 * @returns GitHub search query string
 */
function buildSearchQuery(params: SearchParams, strategy: SearchStrategy): string {
  const parts: string[] = [];

  // Keywords: expanded strategy includes semantic keywords, others use primary only
  const useExpandedKeywords = strategy === "expanded" && params.expanded_keywords.length > 0;
  const keywords = useExpandedKeywords
    ? [...params.keywords, ...params.expanded_keywords]
    : params.keywords;
  parts.push(keywords.join(" "));

  // Language filter
  if (params.language) {
    parts.push(`language:${params.language}`);
  }

  // Star range filter (adjusted per strategy)
  if (params.starRange) {
    const { min, max } = calculateMinStars(strategy, params.starRange);
    parts.push(buildStarRangeQuery(min, max));
  }

  // Topics filter (only for stars and recency strategies to increase diversity)
  if (strategy !== "expanded" && params.topics && params.topics.length > 0) {
    for (const topic of params.topics.slice(0, 2)) {
      parts.push(`topic:${topic}`);
    }
  }

  // Created date filter
  if (params.createdAfter) {
    const dateStr = params.createdAfter.toISOString().split("T")[0];
    parts.push(`created:>${dateStr}`);
  }

  return parts.join(" ");
}

/**
 * Convert GitHub API response to our Repository type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToRepository(item: any): Repository {
  return {
    full_name: item.full_name,
    name: item.name,
    owner: item.owner.login,
    description: item.description,
    stars: item.stargazers_count,
    forks: item.forks_count,
    language: item.language,
    topics: item.topics || [],
    created_at: item.created_at,
    updated_at: item.updated_at,
    pushed_at: item.pushed_at,
    has_readme: true, // GitHub search doesn't provide this, assume true
    is_archived: item.archived,
    is_fork: item.fork,
    license: item.license?.spdx_id || null,
    open_issues_count: item.open_issues_count,
    default_branch: item.default_branch,
    html_url: item.html_url,
  };
}

/**
 * Search GitHub repositories using a single strategy
 *
 * @param octokit - Authenticated Octokit client
 * @param params - Search parameters from Query Translator
 * @param strategy - Search strategy to use
 * @param sortBy - Sort order for results
 * @returns Array of repositories (up to 30)
 */
async function searchWithStrategy(
  octokit: Octokit,
  params: SearchParams,
  strategy: "stars" | "recency" | "expanded",
  sortBy: "stars" | "updated" = "stars"
): Promise<Repository[]> {
  try {
    const query = buildSearchQuery(params, strategy);

    // Search repositories
    const response = await octokit.rest.search.repos({
      q: query,
      sort: sortBy,
      order: "desc",
      per_page: CONFIG.SCOUT.RESULTS_PER_STRATEGY, // 30 results per strategy
    });

    // Convert to our Repository type
    return response.data.items.map(convertToRepository);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    // Handle specific GitHub API errors
    if (err.status === 403 && err.message?.includes("rate limit")) {
      throw new Error(
        "GitHub API rate limit exceeded. Please wait a few minutes and try again."
      );
    }

    if (err.status === 422) {
      throw new Error(
        `Invalid GitHub search query. Please refine your search terms.`
      );
    }

    // Re-throw other errors
    throw new Error(`GitHub search failed: ${err.message || String(error)}`);
  }
}

/**
 * Deduplicate repositories by full_name, keeping the first occurrence
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
 * Filter out archived repositories and trivial forks
 *
 * Rules:
 * - Remove archived repositories (archived: true)
 * - Remove trivial forks (low quality, unmaintained forks)
 * - Keep significant forks (well-maintained forks with substantial activity)
 *
 * @param repos - Array of repositories to filter
 * @returns Filtered array of repositories
 */
function filterRepositories(repos: Repository[]): Repository[] {
  return repos.filter((repo) => {
    // Rule 1: Remove archived repositories
    if (repo.is_archived) {
      return false;
    }

    // Rule 2: Remove trivial forks
    // A fork is considered "trivial" if it has very few stars compared to typical repos
    // We use a simple heuristic: if it's a fork with < 100 stars, likely unmaintained
    if (repo.is_fork && repo.stars < 100) {
      return false;
    }

    // Keep all other repositories (including significant forks)
    return true;
  });
}

/**
 * Scout Agent: Search GitHub for candidate repositories
 *
 * Uses 3 parallel search strategies:
 * 1. Search by Stars (popularity)
 * 2. Search by Recency (recently updated)
 * 3. Search by Expanded Keywords (semantic relevance)
 *
 * @param params - Search parameters from Query Translator
 * @param useMultiStrategy - Whether to use multi-strategy search (default: true)
 * @returns Array of 50-100 unique candidate repositories
 */
export async function scoutRepositories(
  params: SearchParams,
  useMultiStrategy: boolean = true
): Promise<Repository[]> {
  const octokit = createGitHubClient();

  // Task 2.1: Single strategy (for testing)
  if (!useMultiStrategy) {
    const results = await searchWithStrategy(octokit, params, "stars", "stars");
    return results;
  }

  // Task 2.2: Multi-strategy parallel search
  console.log("🔍 Executing multi-strategy search...");

  const [starResults, recencyResults, expandedResults] = await Promise.all([
    // Strategy 1: Search by Stars (popularity)
    searchWithStrategy(octokit, params, "stars", "stars").catch((error) => {
      console.warn(`Strategy 1 (stars) failed: ${error.message}`);
      return [];
    }),

    // Strategy 2: Search by Recency (recently updated)
    searchWithStrategy(octokit, params, "recency", "updated").catch((error) => {
      console.warn(`Strategy 2 (recency) failed: ${error.message}`);
      return [];
    }),

    // Strategy 3: Search by Expanded Keywords (if available)
    params.expanded_keywords.length > 0
      ? searchWithStrategy(octokit, params, "expanded", "stars").catch(
          (error) => {
            console.warn(
              `Strategy 3 (expanded keywords) failed: ${error.message}`
            );
            return [];
          }
        )
      : Promise.resolve([]),
  ]);

  console.log(
    `  Strategy 1 (stars): ${starResults.length} results`
  );
  console.log(
    `  Strategy 2 (recency): ${recencyResults.length} results`
  );
  console.log(
    `  Strategy 3 (expanded): ${expandedResults.length} results`
  );

  // Merge all results
  const allResults = [...starResults, ...recencyResults, ...expandedResults];

  // Deduplicate by full_name
  const uniqueResults = deduplicateRepositories(allResults);

  // Filter out archived repos and trivial forks
  const filteredResults = filterRepositories(uniqueResults);

  console.log(
    `  After filtering: ${filteredResults.length} candidates (removed ${uniqueResults.length - filteredResults.length} archived/trivial forks)`
  );
  console.log(
    `  Total unique candidates: ${filteredResults.length} (target: ${CONFIG.SCOUT.MIN_CANDIDATES}-${CONFIG.SCOUT.MAX_CANDIDATES})`
  );

  return filteredResults;
}

/**
 * Scout node for LangGraph workflow
 */
export async function scoutNode(state: {
  searchParams?: SearchParams;
  executionTime: Record<string, number>;
}): Promise<{
  candidateRepos: Repository[];
  executionTime: Record<string, number>;
}> {
  if (!state.searchParams) {
    throw new Error("searchParams is required for Scout agent");
  }

  const startTime = Date.now();

  const candidateRepos = await scoutRepositories(state.searchParams);

  const executionTime = {
    ...state.executionTime,
    scout: Date.now() - startTime,
  };

  return {
    candidateRepos,
    executionTime,
  };
}
