/**
 * Test script for Phase 1: Query Translator
 *
 * Run with: bun run scripts/test-phase1.ts
 *
 * This script validates:
 * 1. Query Translator extracts keywords correctly
 * 2. Semantic expansion works based on searchMode
 * 3. Star range inference is independent of searchMode
 * 4. LangGraph workflow executes successfully
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";

/**
 * Test queries covering different scenarios
 */
const TEST_QUERIES = [
  {
    name: "Test 1: Popular library (balanced mode)",
    query: "popular React animation library",
    searchMode: "balanced" as const,
    expectations: {
      shouldIncludeKeywords: ["React", "animation"],
      shouldHaveExpandedKeywords: true, // balanced mode should expand
      minStarsShouldBe: 1000, // "popular" keyword
    },
  },
  {
    name: "Test 2: New project (exploratory mode)",
    query: "new Rust web framework",
    searchMode: "exploratory" as const,
    expectations: {
      shouldIncludeKeywords: ["Rust", "web"],
      shouldHaveExpandedKeywords: true, // exploratory mode expands more
      minStarsShouldBe: 10, // "new" keyword
      maxStarsShouldBe: 1000,
    },
  },
  {
    name: "Test 3: Specific query (focused mode)",
    query: "TypeScript ORM for PostgreSQL",
    searchMode: "focused" as const,
    expectations: {
      shouldIncludeKeywords: ["TypeScript", "ORM"],
      shouldHaveExpandedKeywords: false, // focused mode doesn't expand
      minStarsShouldBe: 50, // default
    },
  },
  {
    name: "Test 4: Lightweight library (balanced mode)",
    query: "lightweight state management",
    searchMode: "balanced" as const,
    expectations: {
      shouldIncludeKeywords: ["lightweight", "state", "management"],
      shouldHaveExpandedKeywords: true, // balanced mode should expand
      minStarsShouldBe: 50, // default (lightweight is a feature, not popularity)
    },
  },
  {
    name: "Test 5: Popular lightweight library (balanced mode)",
    query: "popular lightweight React state management",
    searchMode: "balanced" as const,
    expectations: {
      shouldIncludeKeywords: ["React", "state"], // Core keywords (modifiers like "popular" may be omitted)
      shouldHaveExpandedKeywords: true, // balanced mode should expand
      minStarsShouldBe: 1000, // "popular" keyword affects star range (finds Zustand, Jotai, etc.)
    },
  },
  {
    name: "Test 6: Mature project (exploratory mode)",
    query: "mature Python ML library",
    searchMode: "exploratory" as const,
    expectations: {
      shouldIncludeKeywords: ["Python", "ML"],
      shouldHaveExpandedKeywords: true, // exploratory mode expands
      minStarsShouldBe: 5000, // "mature" keyword
    },
  },
];

/**
 * Run all tests
 */
async function runTests() {
  console.log("🧪 Phase 1 Testing: Query Translator + LangGraph Workflow\n");
  console.log("=" .repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of TEST_QUERIES) {
    console.log(`\n📝 ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Mode: ${test.searchMode}`);

    try {
      const startTime = Date.now();
      const result = await executeSearchPipeline(test.query, test.searchMode);
      const duration = Date.now() - startTime;

      console.log(`✅ Completed in ${duration}ms`);

      // Validate results
      const { searchParams, executionTime } = result;

      if (!searchParams) {
        throw new Error("searchParams is undefined");
      }

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

      console.log("\nExecution Time:");
      console.log(`  Query Translator: ${executionTime.queryTranslator}ms`);

      // Verify expectations
      console.log("\nValidation:");
      const validations: string[] = [];

      // Check keywords
      const hasExpectedKeywords = test.expectations.shouldIncludeKeywords.every(
        (kw) =>
          searchParams.keywords.some((k) =>
            k.toLowerCase().includes(kw.toLowerCase())
          )
      );
      if (hasExpectedKeywords) {
        validations.push("✓ Keywords extracted correctly");
      } else {
        validations.push("✗ Missing expected keywords");
      }

      // Check expanded keywords
      const hasExpandedKeywords =
        searchParams.expanded_keywords.length > 0;
      if (
        test.expectations.shouldHaveExpandedKeywords === hasExpandedKeywords
      ) {
        validations.push(
          `✓ Expansion ${hasExpandedKeywords ? "present" : "absent"} as expected (${test.searchMode} mode)`
        );
      } else {
        validations.push(
          `✗ Expansion ${hasExpandedKeywords ? "present" : "absent"}, expected ${test.expectations.shouldHaveExpandedKeywords ? "present" : "absent"}`
        );
      }

      // Check star range
      const minStarsMatch =
        searchParams.starRange?.min === test.expectations.minStarsShouldBe;
      if (minStarsMatch) {
        validations.push(
          `✓ Min stars correct: ${test.expectations.minStarsShouldBe}`
        );
      } else {
        validations.push(
          `✗ Min stars incorrect: expected ${test.expectations.minStarsShouldBe}, got ${searchParams.starRange?.min}`
        );
      }

      if (test.expectations.maxStarsShouldBe !== undefined) {
        const maxStarsMatch =
          searchParams.starRange?.max === test.expectations.maxStarsShouldBe;
        if (maxStarsMatch) {
          validations.push(
            `✓ Max stars correct: ${test.expectations.maxStarsShouldBe}`
          );
        } else {
          validations.push(
            `✗ Max stars incorrect: expected ${test.expectations.maxStarsShouldBe}, got ${searchParams.starRange?.max}`
          );
        }
      }

      console.log(validations.map((v) => `  ${v}`).join("\n"));

      // Check if all validations passed
      const allPassed = validations.every((v) => v.startsWith("✓"));
      if (allPassed) {
        console.log(`\n✅ ${test.name} PASSED`);
        passedTests++;
      } else {
        console.log(`\n❌ ${test.name} FAILED`);
        failedTests++;
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      failedTests++;
    }

    console.log("─".repeat(70));
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${TEST_QUERIES.length}`);
  console.log(`   Failed: ${failedTests}/${TEST_QUERIES.length}`);

  if (failedTests === 0) {
    console.log("\n🎉 All tests passed! Phase 1 is complete.\n");
  } else {
    console.log(
      "\n⚠️  Some tests failed. Please review the failures above.\n"
    );
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
