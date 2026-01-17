/**
 * Domain-Specific Test Validators
 *
 * Specialized validators for Phase 1 (Query Translator) and Phase 2 (Scout) tests.
 */

import type { Repository, ValidationResult } from "./test-utils";
import type { SearchParams } from "../lib/agents/h1-search-pipeline/types";

// ============================================
// Phase 1: Query Translator Validators
// ============================================

export interface QueryTranslationExpectations {
  shouldIncludeKeywords: string[];
  shouldHaveExpandedKeywords: boolean;
  minStarsShouldBe: number;
  maxStarsShouldBe?: number;
}

export function validateQueryTranslation(
  searchParams: SearchParams | undefined,
  expectations: QueryTranslationExpectations
): ValidationResult[] {
  if (!searchParams) {
    return [{ passed: false, message: "✗ searchParams is undefined" }];
  }

  const results: ValidationResult[] = [];

  // Check keywords
  const hasExpectedKeywords = expectations.shouldIncludeKeywords.every((kw) =>
    searchParams.keywords.some((k) => k.toLowerCase().includes(kw.toLowerCase()))
  );
  results.push({
    passed: hasExpectedKeywords,
    message: hasExpectedKeywords
      ? "✓ Keywords extracted correctly"
      : "✗ Missing expected keywords",
  });

  // Check expanded keywords
  const hasExpandedKeywords = searchParams.expanded_keywords.length > 0;
  results.push({
    passed: hasExpandedKeywords === expectations.shouldHaveExpandedKeywords,
    message: `✓ Expansion ${hasExpandedKeywords ? "present" : "absent"} as expected`,
  });

  // Check min stars
  const minStarsMatch = searchParams.starRange?.min === expectations.minStarsShouldBe;
  results.push({
    passed: minStarsMatch,
    message: minStarsMatch
      ? `✓ Min stars correct: ${expectations.minStarsShouldBe}`
      : `✗ Min stars incorrect: expected ${expectations.minStarsShouldBe}, got ${searchParams.starRange?.min}`,
  });

  // Check max stars if specified
  if (expectations.maxStarsShouldBe !== undefined) {
    const maxStarsMatch = searchParams.starRange?.max === expectations.maxStarsShouldBe;
    results.push({
      passed: maxStarsMatch,
      message: maxStarsMatch
        ? `✓ Max stars correct: ${expectations.maxStarsShouldBe}`
        : `✗ Max stars incorrect: expected ${expectations.maxStarsShouldBe}, got ${searchParams.starRange?.max}`,
    });
  }

  return results;
}

// ============================================
// Phase 2: Scout Validators
// ============================================

export interface ScoutExpectations {
  minResults?: number;
  maxResults?: number;
  minCandidates?: number;
  maxCandidates?: number;
  shouldHaveStars?: boolean;
  minStars?: number;
  languageMatchRate?: number;
  starDistribution?: {
    allowBelowThreshold?: number; // percentage
    minRange?: number;
  };
}

export function validateScoutResults(
  repos: Repository[],
  expectations: ScoutExpectations
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Result count validation
  if (expectations.minResults !== undefined && expectations.maxResults !== undefined) {
    const inRange = repos.length >= expectations.minResults && repos.length <= expectations.maxResults;
    results.push({
      passed: inRange,
      message: inRange
        ? `✓ Result count OK: ${repos.length} (expected ${expectations.minResults}-${expectations.maxResults})`
        : `✗ Result count out of range: ${repos.length} (expected ${expectations.minResults}-${expectations.maxResults})`,
    });
  }

  // Candidate count validation (for multi-strategy)
  if (expectations.minCandidates !== undefined && expectations.maxCandidates !== undefined) {
    const inRange = repos.length >= expectations.minCandidates && repos.length <= expectations.maxCandidates;
    results.push({
      passed: inRange,
      message: inRange
        ? `✓ Candidate count OK: ${repos.length} (expected ${expectations.minCandidates}-${expectations.maxCandidates})`
        : `✗ Candidate count out of range: ${repos.length} (expected ${expectations.minCandidates}-${expectations.maxCandidates})`,
    });
  }

  // Star threshold validation
  if (expectations.shouldHaveStars && expectations.minStars !== undefined) {
    const belowThreshold = repos.filter((r) => r.stars < expectations.minStars!);
    const allMeet = belowThreshold.length === 0;
    results.push({
      passed: allMeet,
      message: allMeet
        ? `✓ All results meet star requirement (${expectations.minStars}+)`
        : `✗ ${belowThreshold.length} results below star threshold`,
    });
  }

  // Star distribution for multi-strategy (relaxed validation)
  if (expectations.starDistribution?.allowBelowThreshold !== undefined) {
    const originalMin = expectations.minStars || 0;
    const belowThreshold = repos.filter((r) => r.stars < originalMin);
    const belowPercentage = (belowThreshold.length / repos.length) * 100;
    const allowed = expectations.starDistribution.allowBelowThreshold;

    results.push({
      passed: belowPercentage <= allowed,
      message:
        belowPercentage <= allowed
          ? `✓ Star distribution OK: ${repos.length - belowThreshold.length} meet ${originalMin}+ threshold`
          : `✗ Too many results below threshold: ${belowPercentage.toFixed(0)}% below ${originalMin} stars`,
    });
  }

  // Result diversity
  if (repos.length > 0) {
    const starCounts = repos.map((r) => r.stars).sort((a, b) => b - a);
    const starRange = starCounts[0] - starCounts[starCounts.length - 1];
    const minRange = expectations.starDistribution?.minRange || 0;

    results.push({
      passed: starRange >= minRange,
      message:
        starRange > minRange
          ? `✓ Good diversity in results (star range: ${starCounts[starCounts.length - 1].toLocaleString()} - ${starCounts[0].toLocaleString()})`
          : `✓ Results diversity: ${starCounts[starCounts.length - 1].toLocaleString()} - ${starCounts[0].toLocaleString()} stars`,
    });
  }

  return results;
}

// ============================================
// Pipeline Validators
// ============================================

export interface PipelineExpectations {
  minCandidates?: number;
  maxExecutionTime?: number;
}

export function validatePipelineFlow(
  searchParams: SearchParams | undefined,
  candidateRepos: Repository[] | undefined,
  executionTime: { total?: number; queryTranslator?: number; scout?: number },
  expectations: PipelineExpectations
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Query translation successful
  results.push({
    passed: !!searchParams,
    message: searchParams ? "✓ Query translation successful" : "✗ Query translation failed",
  });

  // Scout found sufficient candidates
  if (expectations.minCandidates !== undefined) {
    const hasEnough = candidateRepos && candidateRepos.length >= expectations.minCandidates;
    results.push({
      passed: !!hasEnough,
      message: hasEnough
        ? `✓ Scout found sufficient candidates (${candidateRepos?.length})`
        : `⚠ Scout found fewer candidates than expected (${candidateRepos?.length || 0})`,
    });
  }

  // Performance validation
  if (expectations.maxExecutionTime && executionTime.total) {
    const fastEnough = executionTime.total < expectations.maxExecutionTime;
    results.push({
      passed: fastEnough,
      message: fastEnough
        ? `✓ Performance good (${executionTime.total}ms < ${expectations.maxExecutionTime}ms)`
        : `⚠ Performance slow (${executionTime.total}ms > ${expectations.maxExecutionTime}ms)`,
    });
  }

  return results;
}

// ============================================
// Display Helpers for Phase Tests
// ============================================

export function displayPhase1Results(
  searchParams: SearchParams | undefined,
  executionTime: { queryTranslator?: number }
): void {
  if (!searchParams) return;

  console.log("\nExtracted Parameters:");
  console.log(`  Keywords: ${searchParams.keywords.join(", ")}`);
  console.log(
    `  Expanded Keywords: ${searchParams.expanded_keywords.join(", ") || "(none)"}`
  );
  console.log(`  Language: ${searchParams.language || "(not specified)"}`);
  console.log(
    `  Star Range: min=${searchParams.starRange?.min}, max=${searchParams.starRange?.max || "∞"}`
  );
  console.log(`  Topics: ${searchParams.topics?.join(", ") || "(none)"}`);
  console.log(`\n  Query Translator: ${executionTime.queryTranslator}ms`);
}

export function displayScoutResults(
  repos: Repository[],
  executionTime: number
): void {
  console.log(`\n🔍 Scout Results:`);
  console.log(`  Candidates Found: ${repos.length}`);
  console.log(`  Execution Time: ${executionTime}ms`);

  if (repos.length > 0) {
    console.log(`\n  Top 5 Candidates:`);
    repos.slice(0, 5).forEach((repo, idx) => {
      console.log(`    ${idx + 1}. ${repo.full_name} (⭐ ${repo.stars.toLocaleString()})`);
    });
  }
}
