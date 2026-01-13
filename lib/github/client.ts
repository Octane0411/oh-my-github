/**
 * GitHub API client with rate limiting and error handling
 * @module lib/github/client
 */

import { Octokit } from "@octokit/rest";

/**
 * Rate limit threshold for warnings (in remaining requests)
 */
const RATE_LIMIT_WARNING_THRESHOLD = 100;

/**
 * Singleton Octokit client instance
 */
let octokitInstance: Octokit | null = null;

/**
 * Rate limit information from the last API call
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

let lastRateLimitInfo: RateLimitInfo | null = null;

/**
 * Initialize and return authenticated Octokit client
 *
 * @returns {Octokit} Authenticated Octokit instance
 * @throws {Error} If GITHUB_TOKEN environment variable is not set
 *
 * @example
 * const client = getOctokit();
 * const { data } = await client.rest.repos.get({ owner: "octokit", repo: "rest.js" });
 */
export function getOctokit(): Octokit {
  if (octokitInstance) {
    return octokitInstance;
  }

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not set. " +
      "Please create a Personal Access Token with 'repo', 'read:org', and 'read:user' scopes."
    );
  }

  octokitInstance = new Octokit({
    auth: token,
    userAgent: "oh-my-github/1.0.0",
    // Add rate limit hook to track usage
    request: {
      hook: async (request, options) => {
        const response = await request(options);

        // Update rate limit info from response headers
        if (response.headers) {
          updateRateLimitInfo(response.headers);
        }

        return response;
      },
    },
  });

  return octokitInstance;
}

/**
 * Update rate limit information from response headers
 *
 * @param {Record<string, string>} headers - Response headers
 */
function updateRateLimitInfo(headers: Record<string, string>): void {
  const limit = parseInt(headers["x-ratelimit-limit"] || "0", 10);
  const remaining = parseInt(headers["x-ratelimit-remaining"] || "0", 10);
  const reset = new Date(parseInt(headers["x-ratelimit-reset"] || "0", 10) * 1000);
  const used = parseInt(headers["x-ratelimit-used"] || "0", 10);

  lastRateLimitInfo = { limit, remaining, reset, used };

  // Warn if approaching rate limit
  if (remaining < RATE_LIMIT_WARNING_THRESHOLD) {
    console.warn(
      `⚠️  GitHub API rate limit warning: ${remaining}/${limit} requests remaining. ` +
      `Resets at ${reset.toISOString()}`
    );
  }
}

/**
 * Get current rate limit information
 *
 * @returns {Promise<RateLimitInfo>} Current rate limit status
 *
 * @example
 * const rateLimit = await getRateLimitInfo();
 * console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
 */
export async function getRateLimitInfo(): Promise<RateLimitInfo> {
  // If we have cached info, return it
  if (lastRateLimitInfo) {
    return lastRateLimitInfo;
  }

  // Otherwise fetch fresh rate limit data
  const octokit = getOctokit();
  const { data } = await octokit.rest.rateLimit.get();

  const core = data.resources.core;
  lastRateLimitInfo = {
    limit: core.limit,
    remaining: core.remaining,
    reset: new Date(core.reset * 1000),
    used: core.used,
  };

  return lastRateLimitInfo;
}

/**
 * Check if we have sufficient API quota remaining
 *
 * @param {number} requiredCalls - Number of API calls needed
 * @returns {Promise<boolean>} True if sufficient quota available
 *
 * @example
 * if (await hasRateLimitQuota(50)) {
 *   // Proceed with API calls
 * } else {
 *   console.error("Insufficient API quota");
 * }
 */
export async function hasRateLimitQuota(requiredCalls: number = 1): Promise<boolean> {
  const info = await getRateLimitInfo();
  return info.remaining >= requiredCalls;
}

/**
 * Format rate limit info for display
 *
 * @returns {Promise<string>} Formatted rate limit string
 *
 * @example
 * console.log(await formatRateLimitInfo());
 * // Output: "Rate Limit: 4850/5000 remaining (97% available, resets at 2024-01-13T10:30:00Z)"
 */
export async function formatRateLimitInfo(): Promise<string> {
  const info = await getRateLimitInfo();
  const percentage = ((info.remaining / info.limit) * 100).toFixed(1);
  return (
    `Rate Limit: ${info.remaining}/${info.limit} remaining ` +
    `(${percentage}% available, resets at ${info.reset.toISOString()})`
  );
}

/**
 * Caching strategy documentation:
 *
 * Current implementation: No caching (PoC phase)
 *
 * Future Phase 5 integration plan:
 * - Use Vercel KV or Upstash Redis for caching
 * - Cache repository search results with 24h TTL
 * - Cache repository metadata with 24h TTL
 * - Cache key format: `github:search:{hash}` or `github:repo:{owner}:{name}`
 * - Invalidation: Manual refresh or TTL expiry
 *
 * Benefits:
 * - Reduce API calls by ~80% for repeated queries
 * - Respect GitHub rate limits (5000 req/h)
 * - Faster response times for cached data
 */
