/**
 * GitHub repository search functionality
 * @module lib/github/search
 */

import { getOctokit } from "./client";

/**
 * Search parameters for repository discovery
 */
export interface SearchParams {
  /** Search keywords (e.g., "RAG framework", "AI agent") */
  keywords: string;
  /** Programming language filter (e.g., "Python", "TypeScript") */
  language?: string;
  /** Minimum stars count */
  minStars?: number;
  /** Maximum stars count */
  maxStars?: number;
  /** Minimum creation date (ISO format: "2023-01-01") */
  createdAfter?: string;
  /** Maximum number of results to return (default: 100, max: 100) */
  maxResults?: number;
  /** Sort order: "stars", "forks", "updated" (default: "stars") */
  sortBy?: "stars" | "forks" | "updated";
  /** Include forks in results (default: false) */
  includeForks?: boolean;
  /** Include archived repos (default: false) */
  includeArchived?: boolean;
}

/**
 * Simplified repository information from search
 */
export interface SearchResult {
  /** Repository owner */
  owner: string;
  /** Repository name */
  name: string;
  /** Full repository name (owner/name) */
  fullName: string;
  /** Repository description */
  description: string | null;
  /** Repository URL */
  url: string;
  /** Star count */
  stars: number;
  /** Fork count */
  forks: number;
  /** Primary language */
  language: string | null;
  /** Creation date */
  createdAt: string;
  /** Last update date */
  updatedAt: string;
  /** Topics/tags */
  topics: string[];
  /** Is fork? */
  isFork: boolean;
  /** Is archived? */
  isArchived: boolean;
  /** Open issues count */
  openIssues: number;
}

/**
 * Build GitHub Search API query string from parameters
 *
 * @param {SearchParams} params - Search parameters
 * @returns {string} GitHub search query string
 *
 * @example
 * buildSearchQuery({ keywords: "RAG framework", language: "Python", minStars: 100 })
 * // Returns: "RAG framework language:Python stars:>=100"
 */
export function buildSearchQuery(params: SearchParams): string {
  const parts: string[] = [params.keywords];

  if (params.language) {
    parts.push(`language:${params.language}`);
  }

  // Handle stars range
  if (params.minStars !== undefined && params.maxStars !== undefined) {
    parts.push(`stars:${params.minStars}..${params.maxStars}`);
  } else if (params.minStars !== undefined) {
    parts.push(`stars:>=${params.minStars}`);
  } else if (params.maxStars !== undefined) {
    parts.push(`stars:<=${params.maxStars}`);
  }

  // Handle creation date
  if (params.createdAfter) {
    parts.push(`created:>=${params.createdAfter}`);
  }

  // Exclude forks by default
  if (!params.includeForks) {
    parts.push("fork:false");
  }

  // Exclude archived by default
  if (!params.includeArchived) {
    parts.push("archived:false");
  }

  return parts.join(" ");
}

/**
 * Search GitHub repositories with given parameters
 *
 * @param {SearchParams} params - Search parameters
 * @returns {Promise<SearchResult[]>} Array of matching repositories
 * @throws {Error} If search fails or rate limit exceeded
 *
 * @example
 * const results = await searchRepositories({
 *   keywords: "RAG framework",
 *   language: "Python",
 *   minStars: 100,
 *   maxStars: 5000,
 *   maxResults: 50
 * });
 * console.log(`Found ${results.length} repositories`);
 */
export async function searchRepositories(
  params: SearchParams
): Promise<SearchResult[]> {
  const octokit = getOctokit();
  const query = buildSearchQuery(params);
  const maxResults = Math.min(params.maxResults || 100, 100);
  const perPage = Math.min(maxResults, 100);
  const sortBy = params.sortBy || "stars";

  console.log(`🔍 Searching GitHub: "${query}"`);
  console.log(`   Sort by: ${sortBy}, Max results: ${maxResults}`);

  try {
    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: sortBy,
      order: "desc",
      per_page: perPage,
    });

    console.log(`   Found ${data.total_count} total matches (returning ${data.items.length})`);

    // Transform results
    const results: SearchResult[] = data.items
      .filter((repo) => repo.owner !== null)
      .map((repo) => ({
      owner: repo.owner!.login,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      topics: repo.topics || [],
      isFork: repo.fork,
      isArchived: repo.archived,
      openIssues: repo.open_issues_count,
    }));

    // Additional filtering (GitHub API sometimes returns forks/archived despite filters)
    const filtered = results.filter((repo) => {
      if (!params.includeForks && repo.isFork) return false;
      if (!params.includeArchived && repo.isArchived) return false;
      return true;
    });

    console.log(`   After deduplication: ${filtered.length} repositories`);

    return filtered.slice(0, maxResults);
  } catch (error: unknown) {
    // Handle rate limiting
    const errorWithStatus = error as { status?: number; message?: string; response?: { headers?: Record<string, string> } };
    if (errorWithStatus.status === 403 && errorWithStatus.message?.includes("rate limit")) {
      const resetTime = errorWithStatus.response?.headers?.["x-ratelimit-reset"];
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;

      throw new Error(
        `GitHub API rate limit exceeded. ` +
        `Resets at ${resetDate?.toISOString() || "unknown time"}. ` +
        `Please try again later or use a different authentication token.`
      );
    }

    // Re-throw other errors
    throw new Error(`GitHub search failed: ${errorWithStatus.message || 'Unknown error'}`);
  }
}

/**
 * Search repositories with keyword expansion for better discovery
 *
 * This function expands search terms with related keywords to find more relevant repositories.
 * Future enhancement: Use LLM for intelligent keyword expansion based on creativity level.
 *
 * @param {SearchParams} params - Base search parameters
 * @param {string[]} synonyms - Additional related keywords to search
 * @returns {Promise<SearchResult[]>} Deduplicated array of matching repositories
 *
 * @example
 * const results = await searchWithExpansion(
 *   { keywords: "agent", language: "Python", minStars: 100 },
 *   ["autonomous", "LLM orchestration"]
 * );
 */
export async function searchWithExpansion(
  params: SearchParams,
  synonyms: string[] = []
): Promise<SearchResult[]> {
  if (synonyms.length === 0) {
    return searchRepositories(params);
  }

  console.log(`🔍 Expanded search with synonyms: ${synonyms.join(", ")}`);

  // Perform multiple searches
  const allQueries = [params.keywords, ...synonyms];
  const searchPromises = allQueries.map((keyword) =>
    searchRepositories({ ...params, keywords: keyword })
  );

  const allResults = await Promise.all(searchPromises);

  // Deduplicate by full_name
  const uniqueRepos = new Map<string, SearchResult>();
  for (const results of allResults) {
    for (const repo of results) {
      if (!uniqueRepos.has(repo.fullName)) {
        uniqueRepos.set(repo.fullName, repo);
      }
    }
  }

  const deduped = Array.from(uniqueRepos.values());

  // Sort by stars descending
  deduped.sort((a, b) => b.stars - a.stars);

  console.log(`   Combined & deduplicated: ${deduped.length} unique repositories`);

  // Limit to maxResults
  return deduped.slice(0, params.maxResults || 100);
}
