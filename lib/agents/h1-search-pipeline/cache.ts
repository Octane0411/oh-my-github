/**
 * Simple LRU Cache for Search Results
 *
 * Caches search pipeline results to avoid redundant LLM API calls
 * and GitHub API requests for frequently searched queries.
 *
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - Configurable max size and TTL
 * - Cache key based on query + mode
 * - In-memory storage (no persistence)
 */

import LRUCache from "lru-cache";
import type { SearchPipelineState } from "./types";

/**
 * Cache key for a search query
 */
function getCacheKey(query: string, mode: string): string {
  return `${query.toLowerCase().trim()}:${mode}`;
}

/**
 * Search Result Cache
 *
 * Uses LRU cache with:
 * - Max 100 entries
 * - 1 hour TTL (time-to-live)
 */
const searchCache = new LRUCache<string, SearchPipelineState>({
  max: 100, // Maximum number of cached results
  ttl: 1000 * 60 * 60, // 1 hour in milliseconds
  updateAgeOnGet: true, // Refresh TTL on cache hit
});

/**
 * Get cached search result
 *
 * @param query - User query
 * @param mode - Search mode
 * @returns Cached result if available, undefined otherwise
 */
export function getCachedResult(
  query: string,
  mode: string
): SearchPipelineState | undefined {
  const key = getCacheKey(query, mode);
  const cached = searchCache.get(key);

  if (cached) {
    console.log(`[Cache] HIT: "${query}" (${mode})`);
    return {
      ...cached,
      cached: true, // Mark as cached result
    };
  }

  console.log(`[Cache] MISS: "${query}" (${mode})`);
  return undefined;
}

/**
 * Store search result in cache
 *
 * @param query - User query
 * @param mode - Search mode
 * @param result - Search pipeline result
 */
export function setCachedResult(
  query: string,
  mode: string,
  result: SearchPipelineState
): void {
  const key = getCacheKey(query, mode);
  searchCache.set(key, result);
  console.log(`[Cache] SET: "${query}" (${mode})`);
}

/**
 * Clear all cached results
 */
export function clearCache(): void {
  searchCache.clear();
  console.log("[Cache] Cleared all entries");
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: searchCache.size,
    max: searchCache.max,
  };
}
