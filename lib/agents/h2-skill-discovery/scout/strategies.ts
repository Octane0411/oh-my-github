/**
 * GitHub Search Strategies for Scout
 *
 * Three parallel strategies optimized for tool/library discovery:
 * 1. Primary Search: Core keywords with popularity filter
 * 2. Tool-Focused Search: Emphasizes CLI/library indicators
 * 3. Ecosystem Search: Targets package ecosystems (npm, pypi, etc.)
 */

import { Octokit } from "@octokit/rest";
import { Repository } from "../state";

/**
 * Convert GitHub API response to Repository type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapGitHubRepo(item: any): Repository {
  return {
    full_name: item.full_name,
    description: item.description,
    stars: item.stargazers_count,
    forks_count: item.forks_count,
    language: item.language,
    topics: item.topics || [],
    created_at: item.created_at,
    updated_at: item.updated_at,
    pushed_at: item.pushed_at,
    html_url: item.html_url,
    default_branch: item.default_branch,
    archived: item.archived,
    fork: item.fork,
  };
}

/**
 * Get ecosystem tag for a language
 */
function getEcosystemTag(language?: string): string {
  if (!language) return "library";

  const ecosystemMap: Record<string, string> = {
    python: "pypi",
    javascript: "npm",
    typescript: "npm",
    ruby: "gem",
    rust: "crates",
    go: "golang",
    java: "maven",
    php: "packagist",
  };

  return ecosystemMap[language.toLowerCase()] || "library";
}

/**
 * Strategy 1: Primary Search
 * Searches by core keywords with popularity filter
 */
export async function primarySearch(
  octokit: Octokit,
  keywords: string[]
): Promise<Repository[]> {
  try {
    const query = `${keywords.join(" ")} stars:>100`;

    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 20,
    });

    return data.items.map(mapGitHubRepo);
  } catch (error) {
    console.error("Primary search failed:", error);
    return [];
  }
}

/**
 * Strategy 2: Tool-Focused Search
 * Emphasizes CLI and command-line tools
 */
export async function toolFocusedSearch(
  octokit: Octokit,
  keywords: string[],
  toolType?: string
): Promise<Repository[]> {
  try {
    const toolFilter = toolType === "cli"
      ? "topic:cli OR topic:command-line"
      : "topic:cli OR topic:library OR topic:sdk";

    const query = `${keywords.join(" ")} ${toolFilter} stars:>50`;

    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 20,
    });

    return data.items.map(mapGitHubRepo);
  } catch (error) {
    console.error("Tool-focused search failed:", error);
    return [];
  }
}

/**
 * Strategy 3: Ecosystem Search
 * Targets specific package ecosystems
 */
export async function ecosystemSearch(
  octokit: Octokit,
  keywords: string[],
  language?: string
): Promise<Repository[]> {
  try {
    const ecosystemTag = getEcosystemTag(language);
    const query = `${keywords.join(" ")} topic:${ecosystemTag} stars:>50`;

    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 20,
    });

    return data.items.map(mapGitHubRepo);
  } catch (error) {
    console.error("Ecosystem search failed:", error);
    return [];
  }
}

/**
 * Create GitHub client
 */
export function createGitHubClient(): Octokit {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "Missing GITHUB_TOKEN environment variable. Get one at: https://github.com/settings/tokens"
    );
  }

  return new Octokit({ auth: token });
}
