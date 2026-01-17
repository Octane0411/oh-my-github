/**
 * End-to-End Test for Phase 1-2 Complete Pipeline
 *
 * Run with: bun run scripts/test-phase2-complete.ts
 *
 * This script validates the complete Phase 1-2 workflow:
 * User Query → Query Translator → Scout → Candidate Repositories
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
  },
  {
    name: "Test 2: New Rust framework",
    query: "new Rust web framework",
    searchMode: "exploratory" as const,
  },
  {
    name: "Test 3: TypeScript ORM",
    query: "TypeScript ORM for PostgreSQL",
    searchMode: "focused" as const,
  },
];

async function runTests() {
  console.log("🧪 Phase 1-2 Complete Pipeline Test\n");
  console.log("=".repeat(70));

  for (const test of TEST_QUERIES) {
    console.log(`\n📝 ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Mode: ${test.searchMode}`);

    try {
      const result = await executeSearchPipeline(test.query, test.searchMode);

      console.log(`\n✅ Pipeline completed in ${result.executionTime.total}ms`);

      // Display Query Translator results
      console.log(`\n📊 Query Translator Results:`);
      console.log(`  Keywords: ${result.searchParams?.keywords.join(", ")}`);
      console.log(
        `  Expanded: ${result.searchParams?.expanded_keywords.join(", ") || "(none)"}`
      );
      console.log(
        `  Language: ${result.searchParams?.language || "(not specified)"}`
      );
      console.log(
        `  Star Range: ${result.searchParams?.starRange?.min}${result.searchParams?.starRange?.max ? `-${result.searchParams.starRange.max}` : "+"}`
      );
      console.log(
        `  Execution Time: ${result.executionTime.queryTranslator}ms`
      );

      // Display Scout results
      console.log(`\n🔍 Scout Results:`);
      console.log(`  Candidates Found: ${result.candidateRepos?.length || 0}`);
      console.log(`  Execution Time: ${result.executionTime.scout}ms`);

      if (result.candidateRepos && result.candidateRepos.length > 0) {
        console.log(`\n  Top 5 Candidates:`);
        result.candidateRepos.slice(0, 5).forEach((repo, idx) => {
          console.log(
            `    ${idx + 1}. ${repo.full_name} (⭐ ${repo.stars.toLocaleString()})`
          );
        });
      }

      // Validation
      console.log(`\n✅ Validation:`);
      const validations: string[] = [];

      if (result.searchParams) {
        validations.push("  ✓ Query translation successful");
      } else {
        validations.push("  ✗ Query translation failed");
      }

      if (
        result.candidateRepos &&
        result.candidateRepos.length >= 20
      ) {
        validations.push(
          `  ✓ Scout found sufficient candidates (${result.candidateRepos.length})`
        );
      } else {
        validations.push(
          `  ⚠ Scout found fewer candidates than expected (${result.candidateRepos?.length || 0})`
        );
      }

      if (result.executionTime.total && result.executionTime.total < 10000) {
        validations.push(`  ✓ Performance good (${result.executionTime.total}ms < 10s)`);
      } else {
        validations.push(
          `  ⚠ Performance slow (${result.executionTime.total}ms > 10s)`
        );
      }

      console.log(validations.join("\n"));
    } catch (error) {
      console.error(
        `\n❌ Pipeline failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    console.log("\n" + "─".repeat(70));
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n🎉 Phase 1-2 pipeline testing complete!\n");
  console.log("Next steps:");
  console.log("  - Phase 3: Implement Screener (Coarse Filter)");
  console.log("  - Phase 4-5: Implement Multi-Dimensional Scoring");
  console.log("  - Phase 6: Wire up API endpoints\n");
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
