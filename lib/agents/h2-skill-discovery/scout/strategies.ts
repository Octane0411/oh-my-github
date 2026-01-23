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
import { createLLMClient, getModelName, callLLMWithTimeout } from "../llm-config";

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
 * Strategy 1: All-time Best Search
 * Searches for globally popular tools across all time periods
 */
export async function allTimeBestSearch(
  octokit: Octokit,
  keywords: string[],
  language?: string
): Promise<Repository[]> {
  try {
    // Use only top 2-3 core keywords
    const coreKeywords = keywords
      .filter(k => !['library', 'tool', 'package', 'wrapper', 'api', 'sdk', 'cli'].includes(k.toLowerCase()))
      .slice(0, 3);
    
    // Build query with language filter
    const languageFilter = language ? `language:${language}` : '';
    const query = `${coreKeywords.join(" ")} ${languageFilter} stars:>500`.trim();
    console.log(`[All-time Best] Query: "${query}"`);

    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 15,
    });

    console.log(`[All-time Best] Results: ${data.items.length} repos`);
    return data.items.map(mapGitHubRepo);
  } catch (error) {
    console.error("All-time best search failed:", error);
    return [];
  }
}

/**
 * Strategy 2: Recent Rising Search
 * Discovers new and emerging tools from recent years
 * Focuses on projects created after 2024-01-01
 */
export async function recentRisingSearch(
  octokit: Octokit,
  keywords: string[],
  language?: string
): Promise<Repository[]> {
  try {
    // Use only top 2 core keywords for recent search
    const coreKeywords = keywords
      .filter(k => !['library', 'tool', 'package', 'wrapper', 'api', 'sdk', 'cli'].includes(k.toLowerCase()))
      .slice(0, 2);
    
    // Focus on tools created in 2024+
    const languageFilter = language ? `language:${language}` : '';
    const timeFilter = 'created:>2024-01-01';
    const query = `${coreKeywords.join(" ")} ${languageFilter} ${timeFilter} stars:>100`.trim();
    console.log(`[Recent Rising] Query: "${query}"`);

    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 10,
    });

    console.log(`[Recent Rising] Results: ${data.items.length} repos (2024+ only)`);
    return data.items.map(mapGitHubRepo);
  } catch (error) {
    console.error("Recent rising search failed:", error);
    return [];
  }
}

/**
 * Strategy 3: LLM-Guided Search
 * Uses LLM knowledge to recommend specific repository names
 */
export async function llmGuidedSearch(
  octokit: Octokit,
  keywords: string[],
  language?: string
): Promise<Repository[]> {
  try {
    const client = createLLMClient();
    const model = getModelName("translator");
    
    // Build prompt to ask LLM for repository recommendations
    const prompt = `Given this search request: "${keywords.join(" ")}"${language ? ` (language: ${language})` : ''}

List 3-5 well-known GitHub repositories that match this request. For each repository, provide ONLY the full repository name in the format "owner/repo-name".

Return ONLY a JSON array of repository names, nothing else.
Example: ["owner/repo1", "owner/repo2"]`;

    const messages = [{ role: "user" as const, content: prompt }];
    
    const response = await callLLMWithTimeout(client, messages, model, 8000);
    
    // Parse LLM response
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*\n/, '')
        .replace(/\n```\s*$/, '');
    }
    
    const repoNames: string[] = JSON.parse(cleanedResponse);
    console.log(`[LLM-Guided Search] LLM suggested ${repoNames.length} repositories:`, repoNames);
    
    // Fetch each repository from GitHub
    const repos: Repository[] = [];
    for (const repoName of repoNames) {
      try {
        const [owner, repo] = repoName.split('/');
        if (!owner || !repo) continue;
        
        const { data } = await octokit.rest.repos.get({
          owner,
          repo,
        });
        
        repos.push(mapGitHubRepo(data));
      } catch (error) {
        console.warn(`[LLM-Guided Search] Failed to fetch ${repoName}:`, (error as Error).message);
      }
    }
    
    console.log(`[LLM-Guided Search] Results: ${repos.length} repos fetched successfully`);
    return repos;
  } catch (error) {
    console.error("LLM-guided search failed:", error);
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
