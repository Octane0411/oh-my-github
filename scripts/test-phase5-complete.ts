/**
 * End-to-End Test for Phase 1-5 Complete Pipeline
 *
 * Run with: bun run scripts/test-phase5-complete.ts
 *
 * This script validates the complete Phase 1-5 workflow:
 * User Query → Query Translator → Scout → Screener (Stage 1 + Stage 2) → Top 10 Scored Repos
 *
 * IMPORTANT: This test makes real LLM API calls and GitHub API calls.
 * Ensure you have GITHUB_TOKEN and (DEEPSEEK_API_KEY or OPENAI_API_KEY) set.
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";

/**
 * Test queries
 */
const TEST_QUERIES = [
  {
    name: "Test 1: Popular TypeScript ORM",
    query: "TypeScript ORM for PostgreSQL",
    searchMode: "balanced" as const,
    expectations: {
      minTopRepos: 5, // At least 5 repos with scores
      maxTopRepos: 10, // No more than 10 repos
      minOverallScore: 5.0, // Reasonable quality threshold
    },
  },
];

async function runTests() {
  console.log("🧪 Phase 1-5 Complete Pipeline Test (with LLM Scoring)\\n");
  console.log("=".repeat(70));
  console.log("\\nWARNING: This test makes real LLM and GitHub API calls.");
  console.log("Ensure GITHUB_TOKEN and DEEPSEEK_API_KEY/OPENAI_API_KEY are set.\\n");
  console.log("=".repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of TEST_QUERIES) {
    console.log(`\\n📝 ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Mode: ${test.searchMode}`);

    try {
      const result = await executeSearchPipeline(test.query, test.searchMode);

      console.log(`\\n✅ Pipeline completed in ${result.executionTime.total}ms`);

      // Display Query Translator results
      console.log(`\\n📊 Query Translator (${result.executionTime.queryTranslator}ms):`);
      console.log(`  Keywords: ${result.searchParams?.keywords.join(", ")}`);
      console.log(
        `  Expanded: ${result.searchParams?.expanded_keywords.join(", ") || "(none)"}`
      );
      console.log(
        `  Star Range: ${result.searchParams?.starRange?.min}${result.searchParams?.starRange?.max ? `-${result.searchParams.starRange.max}` : "+"}`
      );

      // Display Scout results
      console.log(`\\n🔍 Scout (${result.executionTime.scout}ms):`);
      console.log(`  Candidates: ${result.candidateRepos?.length || 0}`);

      // Display Screener results
      console.log(`\\n🎯 Screener (${result.executionTime.screener}ms):`);
      console.log(
        `  Coarse Filtered (Stage 1): ${result.coarseFilteredRepos?.length || 0}`
      );
      console.log(
        `  Top Repos (Stage 2): ${result.topRepos?.length || 0}`
      );

      if (result.topRepos && result.topRepos.length > 0) {
        console.log(`\\n  🏆 Top 10 Scored Repositories:`);
        result.topRepos.forEach((repo, idx) => {
          console.log(`\\n    ${idx + 1}. ${repo.full_name}`);
          console.log(`       Overall: ${repo.scores.overall}/10`);
          console.log(`       Maturity: ${repo.scores.maturity} | Activity: ${repo.scores.activity} | Community: ${repo.scores.community}`);
          console.log(`       Maintenance: ${repo.scores.maintenance} | Docs: ${repo.scores.documentation} | UX: ${repo.scores.easeOfUse} | Rel: ${repo.scores.relevance}`);
          console.log(`       ⭐ ${repo.stars.toLocaleString()} | 🔀 ${repo.forks.toLocaleString()}`);
        });
      }

      // Validation
      console.log(`\\n✅ Validation:`);
      const validations: string[] = [];

      // Check all stages completed
      if (
        result.searchParams &&
        result.candidateRepos &&
        result.coarseFilteredRepos &&
        result.topRepos
      ) {
        validations.push("  ✓ All pipeline stages completed");
      } else {
        validations.push("  ✗ Some pipeline stages failed");
      }

      // Check top repos count
      const topRepoCount = result.topRepos?.length || 0;
      if (
        topRepoCount >= test.expectations.minTopRepos &&
        topRepoCount <= test.expectations.maxTopRepos
      ) {
        validations.push(
          `  ✓ Top repos count OK: ${topRepoCount} (expected ${test.expectations.minTopRepos}-${test.expectations.maxTopRepos})`
        );
      } else {
        validations.push(
          `  ✗ Top repos count out of range: ${topRepoCount} (expected ${test.expectations.minTopRepos}-${test.expectations.maxTopRepos})`
        );
      }

      // Check all scores are valid
      if (result.topRepos) {
        const allScoresValid = result.topRepos.every((repo) => {
          const scores = repo.scores;
          return (
            scores.overall >= 0 &&
            scores.overall <= 10 &&
            scores.maturity >= 0 &&
            scores.maturity <= 10 &&
            scores.activity >= 0 &&
            scores.activity <= 10 &&
            scores.community >= 0 &&
            scores.community <= 10 &&
            scores.maintenance >= 0 &&
            scores.maintenance <= 10 &&
            scores.documentation >= 0 &&
            scores.documentation <= 10 &&
            scores.easeOfUse >= 0 &&
            scores.easeOfUse <= 10 &&
            scores.relevance >= 0 &&
            scores.relevance <= 10
          );
        });

        if (allScoresValid) {
          validations.push("  ✓ All scores in valid range (0-10)");
        } else {
          validations.push("  ✗ Some scores out of valid range");
        }

        // Check scores are sorted descending
        const sortedByOverall = result.topRepos.every((repo, idx, arr) => {
          if (idx === 0) return true;
          return arr[idx - 1].scores.overall >= repo.scores.overall;
        });

        if (sortedByOverall) {
          validations.push("  ✓ Results sorted by overall score (descending)");
        } else {
          validations.push("  ✗ Results not properly sorted");
        }

        // Check minimum quality threshold
        const topScore = result.topRepos[0]?.scores.overall || 0;
        if (topScore >= test.expectations.minOverallScore) {
          validations.push(
            `  ✓ Top result meets quality threshold (${topScore} >= ${test.expectations.minOverallScore})`
          );
        } else {
          validations.push(
            `  ⚠ Top result below quality threshold (${topScore} < ${test.expectations.minOverallScore})`
          );
        }
      }

      // Check performance
      if (result.executionTime.total && result.executionTime.total < 60000) {
        validations.push(
          `  ✓ Performance good (${result.executionTime.total}ms < 60s)`
        );
      } else {
        validations.push(
          `  ⚠ Performance slow (${result.executionTime.total}ms > 60s)`
        );
      }

      console.log(validations.join("\\n"));

      // Check if all validations passed
      const allPassed = validations.every((v) => v.includes("✓"));
      if (allPassed) {
        console.log(`\\n✅ ${test.name} PASSED`);
        passedTests++;
      } else {
        console.log(`\\n❌ ${test.name} FAILED`);
        failedTests++;
      }
    } catch (error) {
      console.error(
        `\\n❌ Pipeline failed: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof Error && error.stack) {
        console.error(`\\nStack trace:\\n${error.stack}`);
      }
      failedTests++;
    }

    console.log("\\n" + "─".repeat(70));
  }

  // Summary
  console.log("\\n" + "=".repeat(70));
  console.log(`\\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${TEST_QUERIES.length}`);
  console.log(`   Failed: ${failedTests}/${TEST_QUERIES.length}`);

  if (failedTests === 0) {
    console.log("\\n🎉 All tests passed! Phase 1-5 is complete.\\n");
    console.log("Next steps:");
    console.log("  - Phase 6: Wire up API endpoints");
    console.log("  - Phase 7: Performance tuning and caching");
    console.log("  - Phase 8: Documentation and observability\\n");
  } else {
    console.log("\\n⚠️  Some tests failed. Please review the failures above.\\n");
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
