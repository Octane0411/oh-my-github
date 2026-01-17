/**
 * End-to-End Test for Phase 1-3 Complete Pipeline
 *
 * Run with: bun run scripts/test-phase3.ts
 *
 * This script validates the complete Phase 1-3 workflow:
 * User Query → Query Translator → Scout → Screener (Stage 1) → Coarse Filtered Results
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";

/**
 * Test queries
 */
const TEST_QUERIES = [
  {
    name: "Test 1: Popular React library",
    query: "popular React animation library",
    searchMode: "balanced" as const,
    expectations: {
      minCoarseFiltered: 5,
      maxCoarseFiltered: 25,
    },
  },
  {
    name: "Test 2: New Rust framework",
    query: "new Rust web framework",
    searchMode: "exploratory" as const,
    expectations: {
      minCoarseFiltered: 10,
      maxCoarseFiltered: 25,
    },
  },
  {
    name: "Test 3: TypeScript ORM",
    query: "TypeScript ORM for PostgreSQL",
    searchMode: "focused" as const,
    expectations: {
      minCoarseFiltered: 10,
      maxCoarseFiltered: 25,
    },
  },
];

async function runTests() {
  console.log("🧪 Phase 1-3 Complete Pipeline Test\n");
  console.log("=".repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of TEST_QUERIES) {
    console.log(`\n📝 ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Mode: ${test.searchMode}`);

    try {
      const result = await executeSearchPipeline(test.query, test.searchMode);

      console.log(`\n✅ Pipeline completed in ${result.executionTime.total}ms`);

      // Display Query Translator results
      console.log(`\n📊 Query Translator:`);
      console.log(`  Keywords: ${result.searchParams?.keywords.join(", ")}`);
      console.log(
        `  Expanded: ${result.searchParams?.expanded_keywords.join(", ") || "(none)"}`
      );
      console.log(
        `  Star Range: ${result.searchParams?.starRange?.min}${result.searchParams?.starRange?.max ? `-${result.searchParams.starRange.max}` : "+"}`
      );
      console.log(`  Time: ${result.executionTime.queryTranslator}ms`);

      // Display Scout results
      console.log(`\n🔍 Scout:`);
      console.log(`  Candidates: ${result.candidateRepos?.length || 0}`);
      console.log(`  Time: ${result.executionTime.scout}ms`);

      // Display Screener results
      console.log(`\n🎯 Screener (Stage 1 - Coarse Filter):`);
      console.log(
        `  Coarse Filtered: ${result.coarseFilteredRepos?.length || 0}`
      );
      console.log(`  Time: ${result.executionTime.screenerStage1}ms`);

      if (result.coarseFilteredRepos && result.coarseFilteredRepos.length > 0) {
        console.log(`\n  Top 5 After Coarse Filter:`);
        result.coarseFilteredRepos.slice(0, 5).forEach((repo, idx) => {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(repo.updated_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          console.log(
            `    ${idx + 1}. ${repo.full_name} (⭐ ${repo.stars.toLocaleString()}, updated ${daysSinceUpdate}d ago)`
          );
        });
      }

      // Validation
      console.log(`\n✅ Validation:`);
      const validations: string[] = [];

      // Check all stages completed
      if (result.searchParams && result.candidateRepos && result.coarseFilteredRepos) {
        validations.push("  ✓ All pipeline stages completed");
      } else {
        validations.push("  ✗ Some pipeline stages failed");
      }

      // Check coarse filter results
      const coarseCount = result.coarseFilteredRepos?.length || 0;
      if (
        coarseCount >= test.expectations.minCoarseFiltered &&
        coarseCount <= test.expectations.maxCoarseFiltered
      ) {
        validations.push(
          `  ✓ Coarse filter count OK: ${coarseCount} (expected ${test.expectations.minCoarseFiltered}-${test.expectations.maxCoarseFiltered})`
        );
      } else {
        validations.push(
          `  ✗ Coarse filter count out of range: ${coarseCount} (expected ${test.expectations.minCoarseFiltered}-${test.expectations.maxCoarseFiltered})`
        );
      }

      // Check filtering logic
      if (result.coarseFilteredRepos) {
        const allMeetMinStars = result.coarseFilteredRepos.every(
          (r) => r.stars >= 50
        );
        const allRecentlyUpdated = result.coarseFilteredRepos.every((r) => {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(r.updated_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return daysSinceUpdate <= 365;
        });

        if (allMeetMinStars) {
          validations.push("  ✓ All results meet minimum stars (50+)");
        } else {
          validations.push("  ✗ Some results below minimum stars");
        }

        if (allRecentlyUpdated) {
          validations.push("  ✓ All results recently updated (within 12 months)");
        } else {
          validations.push("  ✗ Some results not recently updated");
        }

        // Check sorted by stars
        const sortedByStars = result.coarseFilteredRepos.every((repo, idx, arr) => {
          if (idx === 0) return true;
          return arr[idx - 1].stars >= repo.stars;
        });

        if (sortedByStars) {
          validations.push("  ✓ Results sorted by stars (descending)");
        } else {
          validations.push("  ✗ Results not properly sorted");
        }
      }

      // Check performance
      if (result.executionTime.total && result.executionTime.total < 12000) {
        validations.push(
          `  ✓ Performance good (${result.executionTime.total}ms < 12s)`
        );
      } else {
        validations.push(
          `  ⚠ Performance slow (${result.executionTime.total}ms > 12s)`
        );
      }

      console.log(validations.join("\n"));

      // Check if all validations passed
      const allPassed = validations.every((v) => v.includes("✓"));
      if (allPassed) {
        console.log(`\n✅ ${test.name} PASSED`);
        passedTests++;
      } else {
        console.log(`\n❌ ${test.name} FAILED`);
        failedTests++;
      }
    } catch (error) {
      console.error(
        `\n❌ Pipeline failed: ${error instanceof Error ? error.message : String(error)}`
      );
      failedTests++;
    }

    console.log("\n" + "─".repeat(70));
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${TEST_QUERIES.length}`);
  console.log(`   Failed: ${failedTests}/${TEST_QUERIES.length}`);

  if (failedTests === 0) {
    console.log("\n🎉 All tests passed! Phase 1-3 is complete.\n");
    console.log("Next steps:");
    console.log("  - Phase 4: Implement Metadata-Based Scoring");
    console.log("  - Phase 5: Implement LLM-Based Fine Scoring");
    console.log("  - Phase 6: Wire up API endpoints\n");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the failures above.\n");
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
