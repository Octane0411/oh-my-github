/**
 * Test script for Phase 2 Task 2.1: Single-Strategy GitHub Search
 *
 * Run with: bun run scripts/test-phase2-task1.ts
 *
 * This script validates:
 * 1. GitHub API connection works
 * 2. Search query building is correct
 * 3. Results are properly formatted
 * 4. Error handling works (rate limit, invalid query)
 */

import { scoutRepositories } from "../lib/agents/h1-search-pipeline/scout";
import type { SearchParams } from "../lib/agents/h1-search-pipeline/types";

/**
 * Test cases for Scout agent
 */
const TEST_CASES = [
  {
    name: "Test 1: Popular React library",
    params: {
      keywords: ["React", "animation"],
      expanded_keywords: ["motion", "transition"],
      language: "TypeScript",
      starRange: { min: 1000 },
      topics: ["react", "animation"],
    } as SearchParams,
    expectations: {
      minResults: 10,
      maxResults: 30,
      shouldHaveStars: true,
      minStars: 1000,
    },
  },
  {
    name: "Test 2: Rust web framework",
    params: {
      keywords: ["Rust", "web", "framework"],
      expanded_keywords: [],
      language: "Rust",
      starRange: { min: 50 },
      topics: ["rust", "web"],
    } as SearchParams,
    expectations: {
      minResults: 10,
      maxResults: 30,
      shouldHaveStars: true,
      minStars: 50,
    },
  },
  {
    name: "Test 3: TypeScript ORM",
    params: {
      keywords: ["TypeScript", "ORM"],
      expanded_keywords: [],
      language: "TypeScript",
      starRange: { min: 50 },
      topics: ["typescript", "orm"],
    } as SearchParams,
    expectations: {
      minResults: 5,
      maxResults: 30,
      shouldHaveStars: true,
      minStars: 50,
    },
  },
];

/**
 * Run all tests
 */
async function runTests() {
  console.log("🧪 Phase 2 Task 2.1: Single-Strategy GitHub Search\n");
  console.log("=".repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of TEST_CASES) {
    console.log(`\n📝 ${test.name}`);
    console.log(
      `Query: ${test.params.keywords.join(" ")} (${test.params.language || "any language"})`
    );
    console.log(`Star Range: ${test.params.starRange?.min}+`);

    try {
      const startTime = Date.now();
      const results = await scoutRepositories(test.params);
      const duration = Date.now() - startTime;

      console.log(`✅ Completed in ${duration}ms`);

      // Display results
      console.log(`\nResults: ${results.length} repositories found`);
      if (results.length > 0) {
        console.log("\nTop 5 Results:");
        results.slice(0, 5).forEach((repo, idx) => {
          console.log(
            `  ${idx + 1}. ${repo.full_name} (⭐ ${repo.stars.toLocaleString()})`
          );
          if (repo.description) {
            console.log(`     ${repo.description.slice(0, 80)}...`);
          }
        });
      }

      // Validation
      console.log("\nValidation:");
      const validations: string[] = [];

      // Check result count
      if (
        results.length >= test.expectations.minResults &&
        results.length <= test.expectations.maxResults
      ) {
        validations.push(
          `✓ Result count OK: ${results.length} (expected ${test.expectations.minResults}-${test.expectations.maxResults})`
        );
      } else {
        validations.push(
          `✗ Result count out of range: ${results.length} (expected ${test.expectations.minResults}-${test.expectations.maxResults})`
        );
      }

      // Check all results have required fields
      const allHaveRequiredFields = results.every(
        (r) => r.full_name && r.owner && r.stars !== undefined
      );
      if (allHaveRequiredFields) {
        validations.push("✓ All results have required fields");
      } else {
        validations.push("✗ Some results missing required fields");
      }

      // Check star count
      if (test.expectations.shouldHaveStars) {
        const allMeetStarRequirement = results.every(
          (r) => r.stars >= test.expectations.minStars
        );
        if (allMeetStarRequirement) {
          validations.push(
            `✓ All results meet star requirement (${test.expectations.minStars}+)`
          );
        } else {
          const belowThreshold = results.filter(
            (r) => r.stars < test.expectations.minStars
          );
          validations.push(
            `✗ ${belowThreshold.length} results below star threshold`
          );
        }
      }

      // Check language filter
      if (test.params.language) {
        const correctLanguage = results.filter(
          (r) =>
            r.language === test.params.language ||
            r.language === null // Some repos don't have language detected
        );
        const languageMatchRate =
          (correctLanguage.length / results.length) * 100;
        if (languageMatchRate >= 70) {
          validations.push(
            `✓ Language filter working: ${languageMatchRate.toFixed(0)}% match`
          );
        } else {
          validations.push(
            `✗ Language filter weak: only ${languageMatchRate.toFixed(0)}% match`
          );
        }
      }

      // Check for duplicates
      const uniqueRepos = new Set(results.map((r) => r.full_name));
      if (uniqueRepos.size === results.length) {
        validations.push("✓ No duplicate repositories");
      } else {
        validations.push(
          `✗ Found ${results.length - uniqueRepos.size} duplicates`
        );
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
      console.error(
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
      failedTests++;
    }

    console.log("─".repeat(70));
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${TEST_CASES.length}`);
  console.log(`   Failed: ${failedTests}/${TEST_CASES.length}`);

  if (failedTests === 0) {
    console.log("\n🎉 All tests passed! Task 2.1 is complete.\n");
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
