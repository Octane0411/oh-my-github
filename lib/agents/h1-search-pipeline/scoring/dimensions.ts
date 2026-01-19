/**
 * Multi-Dimensional Scoring System
 *
 * Calculates scores across 7 dimensions (0-10 scale):
 * 1. Maturity (metadata): age + stars + releases
 * 2. Activity (metadata): recent commits + issue/PR velocity
 * 3. Community (metadata): contributors + stars/fork ratio
 * 4. Maintenance (metadata): recent release + issue response
 * 5. Documentation (LLM): README quality + wiki presence
 * 6. Ease of Use (LLM): API clarity + examples
 * 7. Relevance (LLM): how well it matches user query
 *
 * Phase 4 implements dimensions 1-4 (metadata-based).
 * Phase 5 adds dimensions 5-7 (LLM-based).
 */

import type { Repository, DimensionScores } from "../types";
import { CONFIG } from "../types";

/**
 * Calculate Maturity Score (0-10)
 *
 * Factors:
 * - Repository age (older = more mature)
 * - Star count (more stars = more validated)
 * - Number of releases (more releases = more stable)
 *
 * Scoring:
 * - Age: 0-3.5 points based on years
 * - Stars: 0-5 points on log scale
 * - Releases: 0-3 points (estimated from age)
 */
export function calculateMaturity(repo: Repository): number {
  const MILLIS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;
  const ageYears = (Date.now() - new Date(repo.created_at).getTime()) / MILLIS_PER_YEAR;

  const ageScore = calculateAgeScore(ageYears);
  const starsScore = calculateMaturityStarsScore(repo.stars);
  const releasesScore = calculateReleasesScore(ageYears);

  const totalScore = ageScore + starsScore + releasesScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
}

/**
 * Calculate age contribution to maturity score (0-3.5 points)
 */
function calculateAgeScore(ageYears: number): number {
  if (ageYears < 1) return ageYears * 1.5;
  if (ageYears < 3) return 1.5 + (ageYears - 1) * 0.75;
  if (ageYears < 5) return 3 + (ageYears - 3) * 0.25;
  return 3.5;
}

/**
 * Calculate stars contribution to maturity score (0-5 points, log scale)
 */
function calculateMaturityStarsScore(stars: number): number {
  if (stars < 100) return (stars / 100) * 2;
  if (stars < 1000) return 2 + Math.log10(stars / 100) * 1.5;
  if (stars < 10000) return 3.5 + Math.log10(stars / 1000) * 1;
  return 4.5 + Math.min(Math.log10(stars / 10000) * 0.5, 0.5);
}

/**
 * Calculate releases contribution to maturity score (0-3 points)
 *
 * For Phase 4, we estimate releases based on age (~1 release per 6 months)
 */
function calculateReleasesScore(ageYears: number): number {
  const estimatedReleases = Math.min(ageYears * 2, 20);
  if (estimatedReleases < 5) return estimatedReleases * 0.3;
  if (estimatedReleases < 20) return 1.5 + (estimatedReleases - 5) * 0.1;
  return 3;
}

/**
 * Calculate Activity Score (0-10)
 *
 * Factors:
 * - Recent updates (last pushed date) - primary indicator
 * - Open issues count (active discussion)
 * - Stars growth (popularity trend, weighted by recency)
 *
 * Scoring:
 * - Recency: 0-5 points based on days since last push
 * - Open issues: 0-3 points (sweet spot: 10-200 issues)
 * - Stars as activity proxy: 0-2 points (weighted by recency)
 */
export function calculateActivity(repo: Repository): number {
  const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.pushed_at).getTime()) / MILLIS_PER_DAY
  );

  const { score: recencyScore, multiplier: recencyMultiplier } =
    calculateRecencyScore(daysSinceUpdate);

  const issuesScore =
    calculateIssuesScore(repo.open_issues_count) *
    getIssueRecencyMultiplier(daysSinceUpdate);

  const starsActivityScore =
    calculateActivityStarsScore(repo.stars) * recencyMultiplier;

  const totalScore = recencyScore + issuesScore + starsActivityScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
}

/**
 * Calculate recency score and multiplier (0-5 points, multiplier 0-1)
 */
function calculateRecencyScore(daysSinceUpdate: number): {
  score: number;
  multiplier: number;
} {
  if (daysSinceUpdate < 1) return { score: 5, multiplier: 1.0 };
  if (daysSinceUpdate < 7) {
    return { score: 4.5 - (daysSinceUpdate / 7) * 0.5, multiplier: 1.0 };
  }
  if (daysSinceUpdate < 30) {
    return { score: 3.5 - ((daysSinceUpdate - 7) / 23) * 0.5, multiplier: 0.8 };
  }
  if (daysSinceUpdate < 90) {
    return { score: 2 - ((daysSinceUpdate - 30) / 60) * 1, multiplier: 0.5 };
  }
  if (daysSinceUpdate < 180) {
    return { score: 1 - ((daysSinceUpdate - 90) / 90) * 0.5, multiplier: 0.3 };
  }
  if (daysSinceUpdate < 365) {
    return { score: 0.5, multiplier: 0.1 };
  }
  return { score: 0, multiplier: 0 };
}

/**
 * Calculate open issues contribution to activity score (0-3 points)
 *
 * Sweet spot: 10-200 issues indicates healthy activity
 */
function calculateIssuesScore(openIssuesCount: number): number {
  if (openIssuesCount === 0) return 0;
  if (openIssuesCount < 10) return (openIssuesCount / 10) * 1.5;
  if (openIssuesCount < 50) return 1.5 + ((openIssuesCount - 10) / 40) * 0.8;
  if (openIssuesCount < 200) return 2.3 + ((openIssuesCount - 50) / 150) * 0.7;
  return Math.max(3 - (openIssuesCount - 200) / 500, 2);
}

/**
 * Get multiplier for issues score based on project recency
 *
 * Stale issues on inactive projects are discounted
 */
function getIssueRecencyMultiplier(daysSinceUpdate: number): number {
  if (daysSinceUpdate > 365) return 0.3;
  if (daysSinceUpdate > 180) return 0.6;
  if (daysSinceUpdate > 90) return 0.8;
  return 1.0;
}

/**
 * Calculate stars contribution to activity score (0-2 points)
 */
function calculateActivityStarsScore(stars: number): number {
  if (stars < 100) return (stars / 100) * 0.8;
  if (stars < 1000) return 0.8 + ((stars - 100) / 900) * 0.6;
  return Math.min(1.4 + Math.log10(stars / 1000) * 0.3, 2);
}

/**
 * Calculate Community Score (0-10)
 *
 * Factors:
 * - Stars/Forks ratio (higher = more community interest vs forks)
 * - Total stars (larger community)
 * - Fork count (contributions)
 *
 * Scoring:
 * - Stars/Forks ratio: 0-4 points
 * - Stars: 0-3 points
 * - Forks: 0-3 points
 */
export function calculateCommunity(repo: Repository): number {
  const ratio = repo.forks > 0 ? repo.stars / repo.forks : repo.stars;

  const ratioScore = calculateRatioScore(ratio);
  const starsScore = calculateCommunityStarsScore(repo.stars);
  const forksScore = calculateForksScore(repo.forks);

  const totalScore = ratioScore + starsScore + forksScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
}

/**
 * Calculate stars/forks ratio contribution to community score (0-4 points)
 */
function calculateRatioScore(ratio: number): number {
  if (ratio < 3) return (ratio / 3) * 1.2;
  if (ratio < 5) return 1.2 + ((ratio - 3) / 2) * 0.8;
  if (ratio < 10) return 2.0 + ((ratio - 5) / 5) * 0.8;
  if (ratio < 20) return 2.8 + ((ratio - 10) / 10) * 0.6;
  if (ratio < 50) return 3.4 + ((ratio - 20) / 30) * 0.4;
  return Math.min(3.8 + (ratio - 50) / 100, 4);
}

/**
 * Calculate stars contribution to community score (0-3 points)
 */
function calculateCommunityStarsScore(stars: number): number {
  if (stars < 100) return (stars / 100) * 1;
  if (stars < 1000) return 1 + ((stars - 100) / 900) * 1;
  if (stars < 10000) return 2 + ((stars - 1000) / 9000) * 0.8;
  return Math.min(2.8 + Math.log10(stars / 10000) * 0.2, 3);
}

/**
 * Calculate forks contribution to community score (0-3 points)
 */
function calculateForksScore(forks: number): number {
  if (forks < 10) return (forks / 10) * 1;
  if (forks < 100) return 1 + ((forks - 10) / 90) * 1;
  if (forks < 1000) return 2 + ((forks - 100) / 900) * 0.8;
  return Math.min(2.8 + Math.log10(forks / 1000) * 0.2, 3);
}

/**
 * Calculate Maintenance Score (0-10)
 *
 * Factors:
 * - Recent updates (within 30 days)
 * - Repository not archived
 * - Active issue management (open/total ratio)
 *
 * Scoring:
 * - Recent update: 0-6 points based on days since last push
 * - Issue management: 0-4 points based on open issues vs popularity
 */
export function calculateMaintenance(repo: Repository): number {
  if (repo.is_archived) {
    return 0;
  }

  const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.pushed_at).getTime()) / MILLIS_PER_DAY
  );

  const updateScore = calculateMaintenanceUpdateScore(daysSinceUpdate);
  const issueScore = calculateIssueManagementScore(
    repo.open_issues_count,
    repo.stars
  );

  const totalScore = updateScore + issueScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
}

/**
 * Calculate recent update contribution to maintenance score (0-6 points)
 */
function calculateMaintenanceUpdateScore(daysSinceUpdate: number): number {
  if (daysSinceUpdate < 7) return 6;
  if (daysSinceUpdate < 30) return 5 - ((daysSinceUpdate - 7) / 23) * 1.5;
  if (daysSinceUpdate < 90) return 3.5 - ((daysSinceUpdate - 30) / 60) * 2;
  if (daysSinceUpdate < 180) return 1.5 - ((daysSinceUpdate - 90) / 90) * 1;
  if (daysSinceUpdate < 365) return 0.5;
  return 0;
}

/**
 * Calculate issue management contribution to maintenance score (0-4 points)
 *
 * Well-maintained projects have manageable open issues relative to popularity.
 * Expected issues = sqrt(stars) * 2 (rough heuristic)
 */
function calculateIssueManagementScore(
  openIssuesCount: number,
  stars: number
): number {
  const expectedIssues = Math.sqrt(stars) * 2;
  const issueRatio = expectedIssues > 0 ? openIssuesCount / expectedIssues : 1;

  if (issueRatio < 0.5) return 4;
  if (issueRatio < 1) return 3.5;
  if (issueRatio < 2) return 2.5;
  if (issueRatio < 4) return 1.5;
  return 0.5;
}

/**
 * Calculate all metadata-based dimension scores
 *
 * @param repo - Repository to score
 * @returns Partial dimension scores (4 metadata-based dimensions)
 */
export function calculateMetadataScores(repo: Repository): Partial<DimensionScores> {
  return {
    maturity: calculateMaturity(repo),
    activity: calculateActivity(repo),
    community: calculateCommunity(repo),
    maintenance: calculateMaintenance(repo),
  };
}

/**
 * Calculate overall weighted score from all dimensions
 *
 * Note: Weights should ideally sum to 1.0 for proper scaling.
 * Current CONFIG.SCORE_WEIGHTS sums to 1.20, which inflates scores.
 *
 * @param scores - All 7 dimension scores
 * @param weights - Weight for each dimension
 * @returns Overall score (weighted sum, clamped to 0-10)
 */
export function calculateOverallScore(
  scores: Omit<DimensionScores, "overall">,
  weights: typeof CONFIG.SCORE_WEIGHTS = CONFIG.SCORE_WEIGHTS
): number {
  const weightedSum =
    scores.maturity * weights.maturity +
    scores.activity * weights.activity +
    scores.documentation * weights.documentation +
    scores.community * weights.community +
    scores.easeOfUse * weights.easeOfUse +
    scores.maintenance * weights.maintenance +
    scores.relevance * weights.relevance;

  return Math.min(Math.round(weightedSum * 10) / 10, 10);
}
