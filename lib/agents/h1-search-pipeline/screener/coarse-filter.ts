/**
 * Coarse Filter - Screener Stage 1
 *
 * Filters 50-100 candidate repositories down to ~25 using metadata rules.
 *
 * Filtering criteria:
 * - Minimum stars threshold
 * - Recently updated (within past 12 months)
 * - Has README
 * - Not archived (already filtered in Scout)
 */

import type { Repository } from "../types";
import { CONFIG } from "../types";

/**
 * Coarse filter configuration
 */
export interface CoarseFilterConfig {
  /** Minimum stars required */
  minStars: number;

  /** Repository must be updated within this many months */
  updatedWithinMonths: number;

  /** Require README file */
  requireReadme: boolean;

  /** Target number of results after filtering */
  targetCount: number;

  /** Minimum number of results to return (if fewer pass filters) */
  minCount: number;
}

/**
 * Default coarse filter configuration
 */
export const DEFAULT_COARSE_FILTER_CONFIG: CoarseFilterConfig = {
  minStars: CONFIG.COARSE_FILTER.MIN_STARS,
  updatedWithinMonths: CONFIG.COARSE_FILTER.UPDATED_WITHIN_MONTHS,
  requireReadme: CONFIG.COARSE_FILTER.REQUIRE_README,
  targetCount: CONFIG.SCREENER.COARSE_FILTER_TARGET,
  minCount: 10,
};

/**
 * Calculate days since a date
 */
function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if repository meets coarse filter criteria
 */
function meetsFilterCriteria(
  repo: Repository,
  config: CoarseFilterConfig
): boolean {
  // Check minimum stars
  if (repo.stars < config.minStars) {
    return false;
  }

  // Check last update recency
  const daysSinceUpdate = daysSince(repo.updated_at);
  const maxDaysOld = config.updatedWithinMonths * 30;
  if (daysSinceUpdate > maxDaysOld) {
    return false;
  }

  // Check README requirement
  if (config.requireReadme && !repo.has_readme) {
    return false;
  }

  return true;
}

/**
 * Apply coarse filter to candidate repositories
 *
 * Process:
 * 1. Filter by criteria (stars, recency, README)
 * 2. Sort by stars (descending)
 * 3. Return top N results (target: 25, min: 10)
 *
 * @param candidates - Array of candidate repositories from Scout
 * @param config - Filter configuration (optional)
 * @returns Filtered array of repositories (~25)
 */
export function applyCoarseFilter(
  candidates: Repository[],
  config: CoarseFilterConfig = DEFAULT_COARSE_FILTER_CONFIG
): Repository[] {
  console.log(
    `📊 Coarse Filter: Processing ${candidates.length} candidates...`
  );

  // Step 1: Filter by criteria
  const filtered = candidates.filter((repo) =>
    meetsFilterCriteria(repo, config)
  );

  console.log(
    `  Passed criteria: ${filtered.length} (min stars: ${config.minStars}, updated within: ${config.updatedWithinMonths}mo)`
  );

  // Step 2: Sort by stars (descending)
  const sorted = filtered.sort((a, b) => b.stars - a.stars);

  // Step 3: Take top N results
  // If fewer than minCount pass, return all that passed
  // If more than targetCount pass, return top targetCount
  let result: Repository[];

  if (sorted.length < config.minCount) {
    console.log(
      `  ⚠️  Only ${sorted.length} repos passed filter (min: ${config.minCount})`
    );
    result = sorted;
  } else if (sorted.length > config.targetCount) {
    result = sorted.slice(0, config.targetCount);
    console.log(
      `  Selected top ${config.targetCount} from ${sorted.length} candidates`
    );
  } else {
    result = sorted;
    console.log(`  Returning all ${sorted.length} candidates`);
  }

  return result;
}

/**
 * Get filter statistics for debugging/monitoring
 */
export function getFilterStats(
  candidates: Repository[],
  filtered: Repository[],
  config: CoarseFilterConfig
): {
  total: number;
  passed: number;
  filtered: number;
  filterRate: number;
  reasons: {
    belowMinStars: number;
    notRecentlyUpdated: number;
    noReadme: number;
  };
} {
  const stats = {
    total: candidates.length,
    passed: filtered.length,
    filtered: candidates.length - filtered.length,
    filterRate: (filtered.length / candidates.length) * 100,
    reasons: {
      belowMinStars: 0,
      notRecentlyUpdated: 0,
      noReadme: 0,
    },
  };

  // Analyze why repos were filtered out
  const maxDaysOld = config.updatedWithinMonths * 30;

  candidates.forEach((repo) => {
    if (repo.stars < config.minStars) {
      stats.reasons.belowMinStars++;
    }
    if (daysSince(repo.updated_at) > maxDaysOld) {
      stats.reasons.notRecentlyUpdated++;
    }
    if (config.requireReadme && !repo.has_readme) {
      stats.reasons.noReadme++;
    }
  });

  return stats;
}
