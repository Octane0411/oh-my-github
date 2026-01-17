/**
 * Test script for Phase 1: Query Translator
 *
 * Run with: bun run scripts/test-phase1.ts
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";
import {
  formatHeader,
  formatSection,
  formatSummary,
} from "./test-utils";
import {
  validateQueryTranslation,
  displayPhase1Results,
  type QueryTranslationExpectations,
} from "./test-validators";

const TEST_QUERIES: Array<{
  name: string;
  query: string;
  searchMode: "balanced" | "exploratory" | "focused";
  expectations: QueryTranslationExpectations;
}> = [
  {
    name: "Popular library (balanced mode)",
    query: "popular React animation library",
    searchMode: "balanced",
    expectations: {
      shouldIncludeKeywords: ["React", "animation"],
      shouldHaveExpandedKeywords: true,
      minStarsShouldBe: 1000,
    },
  },
  {
    name: "New project (exploratory mode)",
    query: "new Rust web framework",
    searchMode: "exploratory",
    expectations: {
      shouldIncludeKeywords: ["Rust", "web"],
      shouldHaveExpandedKeywords: true,
      minStarsShouldBe: 10,
      maxStarsShouldBe: 1000,
    },
  },
  {
    name: "Specific query (focused mode)",
    query: "TypeScript ORM for PostgreSQL",
    searchMode: "focused",
    expectations: {
      shouldIncludeKeywords: ["TypeScript", "ORM"],
      shouldHaveExpandedKeywords: false,
      minStarsShouldBe: 50,
    },
  },
  {
    name: "Lightweight library (balanced mode)",
    query: "lightweight state management",
    searchMode: "balanced",
    expectations: {
      shouldIncludeKeywords: ["lightweight", "state", "management"],
      shouldHaveExpandedKeywords: true,
      minStarsShouldBe: 50,
    },
  },
  {
    name: "Popular lightweight library (balanced mode)",
    query: "popular lightweight React state management",
    searchMode: "balanced",
    expectations: {
      shouldIncludeKeywords: ["React", "state"],
      shouldHaveExpandedKeywords: true,
      minStarsShouldBe: 1000,
    },
  },
  {
    name: "Mature project (exploratory mode)",
    query: "mature Python ML library",
    searchMode: "exploratory",
    expectations: {
      shouldIncludeKeywords: ["Python", "ML"],
      shouldHaveExpandedKeywords: true,
      minStarsShouldBe: 5000,
    },
  },
];

async function runTests() {
  formatHeader("Phase 1 Testing: Query Translator + LangGraph Workflow");

  let passed = 0;
  let failed = 0;

  for (const test of TEST_QUERIES) {
    formatSection(test.name);
    console.log(`Query: "${test.query}"`);
    console.log(`Mode: ${test.searchMode}`);

    try {
      const startTime = Date.now();
      const result = await executeSearchPipeline(test.query, test.searchMode);
      const duration = Date.now() - startTime;

      console.log(`✅ Completed in ${duration}ms`);
      displayPhase1Results(result.searchParams, {
        queryTranslator: result.executionTime.queryTranslator,
      });

      // Validate
      const validations = validateQueryTranslation(
        result.searchParams,
        test.expectations
      );
      console.log("\nValidation:");
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

  formatSummary(passed, TEST_QUERIES.length, "Phase 1 is complete.");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
