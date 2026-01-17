/**
 * Test script for Phase 2 Task 2.1: Single-Strategy GitHub Search
 *
 * Run with: bun run scripts/test-phase2-task1.ts
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
  validateStarThreshold,
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
    name: "Popular React library",
    params: {
      keywords: ["React", "animation"],
      expanded_keywords: ["motion", "transition"],
      language: "TypeScript",
      starRange: { min: 1000 },
      topics: ["react", "animation"],
    },
    expectations: {
      minResults: 10,
      maxResults: 30,
      shouldHaveStars: true,
      minStars: 1000,
    },
  },
  {
    name: "Rust web framework",
    params: {
      keywords: ["Rust", "web", "framework"],
      expanded_keywords: [],
      language: "Rust",
      starRange: { min: 50 },
      topics: ["rust", "web"],
    },
    expectations: {
      minResults: 10,
      maxResults: 30,
      shouldHaveStars: true,
      minStars: 50,
    },
  },
  {
    name: "TypeScript ORM",
    params: {
      keywords: ["TypeScript", "ORM"],
      expanded_keywords: [],
      language: "TypeScript",
      starRange: { min: 50 },
      topics: ["typescript", "orm"],
    },
    expectations: {
      minResults: 5,
      maxResults: 30,
      shouldHaveStars: true,
      minStars: 50,
    },
  },
];

async function runTests() {
  formatHeader("Phase 2 Task 2.1: Single-Strategy GitHub Search");

  let passed = 0;
  let failed = 0;

  for (const test of TEST_CASES) {
    formatSection(test.name);
    console.log(`Query: ${test.params.keywords.join(" ")} (${test.params.language || "any language"})`);
    console.log(`Star Range: ${test.params.starRange?.min}+`);

    try {
      const startTime = Date.now();
      const results = await scoutRepositories(test.params);
      const duration = Date.now() - startTime;

      console.log(`✅ Completed in ${duration}ms`);
      displayResults(results, { showDescription: true });

      // Validate
      console.log("\nValidation:");
      const validations = [
        validateRequiredFields(results),
        validateResultCount(results.length, test.expectations.minResults!, test.expectations.maxResults!),
        validateStarThreshold(results, test.expectations.minStars!),
        checkDuplicates(results),
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

  formatSummary(passed, TEST_CASES.length, "Task 2.1 is complete.");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
