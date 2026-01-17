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
 * - Age: 0-2 years → 0-3 points, 2-5 years → 3-7 points, 5+ years → 7-10 points
 * - Stars: Log scale, 100 stars → 3 points, 1000 → 6 points, 10000+ → 9-10 points
 * - Releases: 0 → 0 points, 1-5 → 1-3 points, 5-20 → 3-6 points, 20+ → 6-10 points
 */
export function calculateMaturity(repo: Repository): number {
  // Age score (0-3.5 points)
  const ageYears =
    (Date.now() - new Date(repo.created_at).getTime()) /
    (1000 * 60 * 60 * 24 * 365);
  let ageScore = 0;
  if (ageYears < 1) {
    ageScore = ageYears * 1.5; // 0-1.5
  } else if (ageYears < 3) {
    ageScore = 1.5 + (ageYears - 1) * 0.75; // 1.5-3
  } else if (ageYears < 5) {
    ageScore = 3 + (ageYears - 3) * 0.25; // 3-3.5
  } else {
    ageScore = 3.5;
  }

  // Stars score (0-5 points, log scale)
  let starsScore = 0;
  if (repo.stars < 100) {
    starsScore = (repo.stars / 100) * 2; // 0-2
  } else if (repo.stars < 1000) {
    starsScore = 2 + Math.log10(repo.stars / 100) * 1.5; // 2-3.5
  } else if (repo.stars < 10000) {
    starsScore = 3.5 + Math.log10(repo.stars / 1000) * 1; // 3.5-4.5
  } else {
    starsScore = 4.5 + Math.min(Math.log10(repo.stars / 10000) * 0.5, 0.5); // 4.5-5
  }

  // For Phase 4, we don't have releases data, so estimate based on maturity
  // Assume ~1 release per 6 months for active projects
  const estimatedReleases = Math.min(ageYears * 2, 20);
  let releasesScore = 0;
  if (estimatedReleases < 5) {
    releasesScore = estimatedReleases * 0.3; // 0-1.5
  } else if (estimatedReleases < 20) {
    releasesScore = 1.5 + (estimatedReleases - 5) * 0.1; // 1.5-3
  } else {
    releasesScore = 3;
  }

  const totalScore = ageScore + starsScore + releasesScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
}

/**
 * Calculate Activity Score (0-10)
 *
 * Factors:
 * - Recent updates (last pushed date)
 * - Open issues count (active discussion)
 * - Stars growth (popularity trend)
 *
 * Scoring:
 * - Recency: Updated today → 5 points, this week → 4 points, this month → 3 points, older → 0-2 points
 * - Open issues: 0 → 0 points, 10-50 → 2-3 points, 50-200 → 3-4 points (sweet spot for activity)
 * - Stars (as activity proxy): Only contributes if recently updated (recency multiplier)
 */
export function calculateActivity(repo: Repository): number {
  // Recency score (0-5 points) - PRIMARY activity indicator
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  let recencyScore = 0;
  let recencyMultiplier = 1.0; // For weighting stars contribution

  if (daysSinceUpdate < 1) {
    recencyScore = 5;
    recencyMultiplier = 1.0;
  } else if (daysSinceUpdate < 7) {
    recencyScore = 4.5 - (daysSinceUpdate / 7) * 0.5; // 4-4.5
    recencyMultiplier = 1.0;
  } else if (daysSinceUpdate < 30) {
    recencyScore = 3.5 - ((daysSinceUpdate - 7) / 23) * 0.5; // 3-3.5
    recencyMultiplier = 0.8;
  } else if (daysSinceUpdate < 90) {
    recencyScore = 2 - ((daysSinceUpdate - 30) / 60) * 1; // 1-2
    recencyMultiplier = 0.5;
  } else if (daysSinceUpdate < 180) {
    recencyScore = 1 - ((daysSinceUpdate - 90) / 90) * 0.5; // 0.5-1
    recencyMultiplier = 0.3;
  } else if (daysSinceUpdate < 365) {
    recencyScore = 0.5;
    recencyMultiplier = 0.1;
  } else {
    recencyScore = 0;
    recencyMultiplier = 0; // No stars credit for very old projects
  }

  // Open issues score (0-3 points)
  // Sweet spot: 10-200 issues indicates healthy activity
  let issuesScore = 0;
  if (repo.open_issues_count === 0) {
    issuesScore = 0; // No activity
  } else if (repo.open_issues_count < 10) {
    issuesScore = (repo.open_issues_count / 10) * 1.5; // 0-1.5
  } else if (repo.open_issues_count < 50) {
    issuesScore = 1.5 + ((repo.open_issues_count - 10) / 40) * 0.8; // 1.5-2.3
  } else if (repo.open_issues_count < 200) {
    issuesScore = 2.3 + ((repo.open_issues_count - 50) / 150) * 0.7; // 2.3-3
  } else {
    issuesScore = Math.max(3 - (repo.open_issues_count - 200) / 500, 2); // Diminishing for too many issues
  }

  // Stars as activity proxy (0-2 points) - weighted by recency
  let starsActivityScore = 0;
  if (repo.stars < 100) {
    starsActivityScore = (repo.stars / 100) * 0.8;
  } else if (repo.stars < 1000) {
    starsActivityScore = 0.8 + ((repo.stars - 100) / 900) * 0.6;
  } else {
    starsActivityScore = Math.min(1.4 + Math.log10(repo.stars / 1000) * 0.3, 2);
  }
  starsActivityScore *= recencyMultiplier; // Apply recency multiplier

  const totalScore = recencyScore + issuesScore + starsActivityScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
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
 * - Stars/Forks ratio: 1-5 → 1-3 points, 5-20 → 3-6 points, 20+ → 6-10 points
 * - Stars: 100 → 2 points, 1000 → 4 points, 10000+ → 6 points
 * - Forks: 10 → 1 point, 100 → 2 points, 1000+ → 3 points
 */
export function calculateCommunity(repo: Repository): number {
  // Stars/Forks ratio score (0-4 points)
  const ratio = repo.forks > 0 ? repo.stars / repo.forks : repo.stars;
  let ratioScore = 0;
  if (ratio < 3) {
    ratioScore = (ratio / 3) * 1.2; // 0-1.2 (very fork-heavy)
  } else if (ratio < 5) {
    ratioScore = 1.2 + ((ratio - 3) / 2) * 0.8; // 1.2-2.0
  } else if (ratio < 10) {
    ratioScore = 2.0 + ((ratio - 5) / 5) * 0.8; // 2.0-2.8
  } else if (ratio < 20) {
    ratioScore = 2.8 + ((ratio - 10) / 10) * 0.6; // 2.8-3.4
  } else if (ratio < 50) {
    ratioScore = 3.4 + ((ratio - 20) / 30) * 0.4; // 3.4-3.8
  } else {
    ratioScore = Math.min(3.8 + (ratio - 50) / 100, 4);
  }

  // Stars score (0-3 points)
  let starsScore = 0;
  if (repo.stars < 100) {
    starsScore = (repo.stars / 100) * 1;
  } else if (repo.stars < 1000) {
    starsScore = 1 + ((repo.stars - 100) / 900) * 1;
  } else if (repo.stars < 10000) {
    starsScore = 2 + ((repo.stars - 1000) / 9000) * 0.8;
  } else {
    starsScore = Math.min(2.8 + Math.log10(repo.stars / 10000) * 0.2, 3);
  }

  // Forks score (0-3 points)
  let forksScore = 0;
  if (repo.forks < 10) {
    forksScore = (repo.forks / 10) * 1;
  } else if (repo.forks < 100) {
    forksScore = 1 + ((repo.forks - 10) / 90) * 1;
  } else if (repo.forks < 1000) {
    forksScore = 2 + ((repo.forks - 100) / 900) * 0.8;
  } else {
    forksScore = Math.min(2.8 + Math.log10(repo.forks / 1000) * 0.2, 3);
  }

  const totalScore = ratioScore + starsScore + forksScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
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
 * - Recent update: < 7 days → 5 points, < 30 days → 3-5 points, < 90 days → 1-3 points
 * - Not archived: archived → 0, active → base score
 * - Issue ratio: Estimate based on stars (popular repos have more issues)
 */
export function calculateMaintenance(repo: Repository): number {
  // Archived check
  if (repo.is_archived) {
    return 0;
  }

  // Recent update score (0-6 points)
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  let updateScore = 0;
  if (daysSinceUpdate < 7) {
    updateScore = 6;
  } else if (daysSinceUpdate < 30) {
    updateScore = 5 - ((daysSinceUpdate - 7) / 23) * 1.5; // 5-3.5
  } else if (daysSinceUpdate < 90) {
    updateScore = 3.5 - ((daysSinceUpdate - 30) / 60) * 2; // 3.5-1.5
  } else if (daysSinceUpdate < 180) {
    updateScore = 1.5 - ((daysSinceUpdate - 90) / 90) * 1; // 1.5-0.5
  } else if (daysSinceUpdate < 365) {
    updateScore = 0.5;
  } else {
    updateScore = 0;
  }

  // Issue management score (0-4 points)
  // Heuristic: Well-maintained projects have manageable open issues relative to popularity
  const expectedIssues = Math.sqrt(repo.stars) * 2; // Rough estimate
  const issueRatio =
    expectedIssues > 0 ? repo.open_issues_count / expectedIssues : 1;
  let issueScore = 0;
  if (issueRatio < 0.5) {
    issueScore = 4; // Very well maintained
  } else if (issueRatio < 1) {
    issueScore = 3.5;
  } else if (issueRatio < 2) {
    issueScore = 2.5;
  } else if (issueRatio < 4) {
    issueScore = 1.5;
  } else {
    issueScore = 0.5; // Many unresolved issues
  }

  const totalScore = updateScore + issueScore;
  return Math.min(Math.round(totalScore * 10) / 10, 10);
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
 * @param scores - All 7 dimension scores
 * @param weights - Weight for each dimension (should sum to 1.0)
 * @returns Overall score (0-10)
 */
export function calculateOverallScore(
  scores: Omit<DimensionScores, "overall">,
  weights: typeof CONFIG.SCORE_WEIGHTS = CONFIG.SCORE_WEIGHTS
): number {
  // Validate weights sum to approximately 1.0
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    console.warn(
      `Score weights sum to ${weightSum}, expected 1.0. Normalizing...`
    );
  }

  const overall =
    scores.maturity * weights.maturity +
    scores.activity * weights.activity +
    scores.documentation * weights.documentation +
    scores.community * weights.community +
    scores.easeOfUse * weights.easeOfUse +
    scores.maintenance * weights.maintenance +
    scores.relevance * weights.relevance;

  return Math.round(overall * 10) / 10;
}
