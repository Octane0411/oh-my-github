/**
 * Test script for Phase 2 Task 2.2: Multi-Strategy Parallel Search
 *
 * Run with: bun run scripts/test-phase2-task2.ts
 */

import { scoutRepositories } from "../lib/agents/h1-search-pipeline/scout";
import type { SearchParams } from "../lib/agents/h1-search-pipeline/types";
import {
  formatHeader,
  formatSection,
  formatSummary,
  displayResults,
  validateRequiredFields,
  validateResultCount,
  checkDuplicates,
  validatePerformance,
} from "./test-utils";
import { validateScoutResults, type ScoutExpectations } from "./test-validators";

const TEST_CASES: Array<{
  name: string;
  params: SearchParams;
  expectations: ScoutExpectations;
}> = [
  {
    name: "Balanced mode with expansion",
    params: {
      keywords: ["React", "animation"],
      expanded_keywords: ["motion", "transition"],
      language: "TypeScript",
      starRange: { min: 1000 },
      topics: ["react", "animation"],
    },
    expectations: {
      minCandidates: 30,
      maxCandidates: 100,
      starDistribution: { allowBelowThreshold: 50 },
    },
  },
  {
    name: "Exploratory mode with more expansion",
    params: {
      keywords: ["Rust", "web"],
      expanded_keywords: ["http", "server", "async", "axum", "actix"],
      language: "Rust",
      starRange: { min: 50 },
      topics: ["rust", "web"],
    },
    expectations: {
      minCandidates: 30,
      maxCandidates: 100,
      starDistribution: { allowBelowThreshold: 50 },
    },
  },
  {
    name: "Focused mode without expansion",
    params: {
      keywords: ["TypeScript", "ORM"],
      expanded_keywords: [],
      language: "TypeScript",
      starRange: { min: 50 },
      topics: ["typescript", "orm"],
    },
    expectations: {
      minCandidates: 40,
      maxCandidates: 100,
      starDistribution: { allowBelowThreshold: 50, minRange: 1000 },
    },
  },
];

async function runTests() {
  formatHeader("Phase 2 Task 2.2: Multi-Strategy Parallel Search");

  let passed = 0;
  let failed = 0;

  for (const test of TEST_CASES) {
    formatSection(test.name);
    console.log(`Keywords: ${test.params.keywords.join(", ")}`);
    console.log(
      `Expanded: ${test.params.expanded_keywords.length > 0 ? test.params.expanded_keywords.join(", ") : "(none)"}`
    );
    console.log(`Star Range: ${test.params.starRange?.min}+`);

    try {
      const startTime = Date.now();
      const results = await scoutRepositories(test.params, true); // multi-strategy
      const duration = Date.now() - startTime;

      console.log(`✅ Completed in ${duration}ms`);
      displayResults(results);

      // Validate
      console.log("\nValidation:");
      const validations = [
        validateRequiredFields(results),
        validateResultCount(results.length, test.expectations.minCandidates!, test.expectations.maxCandidates!),
        checkDuplicates(results),
        ...validateScoutResults(results, test.expectations),
        validatePerformance(duration, 5000),
      ];

      validations.forEach((v) => console.log(`  ${v.message}`));

      const allPassed = validations.every((v) => v.passed);
      if (allPassed) {
        passed++;
        console.log(`\n✅ ${test.name} PASSED`);
      } else {
        failed++;
        console.log(`\n❌ ${test.name} FAILED`);
      }
    } catch (error) {
      failed++;
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`\n❌ ${test.name} FAILED`);
    }
  }

  formatSummary(passed, TEST_CASES.length, "Task 2.2 is complete.");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
