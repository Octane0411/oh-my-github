/**
 * End-to-End Test for Phase 1-2 Complete Pipeline
 *
 * Run with: bun run scripts/test-phase2-complete.ts
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";
import { formatHeader, formatSection, displayResults } from "./test-utils";
import { validatePipelineFlow, displayPhase1Results, displayScoutResults } from "./test-validators";

const TEST_QUERIES = [
  { name: "Popular React library", query: "popular React animation library", searchMode: "balanced" as const },
  { name: "New Rust framework", query: "new Rust web framework", searchMode: "exploratory" as const },
  { name: "TypeScript ORM", query: "TypeScript ORM for PostgreSQL", searchMode: "focused" as const },
];

async function runTests() {
  formatHeader("Phase 1-2 Complete Pipeline Test");

  for (const test of TEST_QUERIES) {
    formatSection(test.name);
    console.log(`Query: "${test.query}"`);
    console.log(`Mode: ${test.searchMode}`);

    try {
      const startTime = Date.now();
      const result = await executeSearchPipeline(test.query, test.searchMode);
      const duration = Date.now() - startTime;

      console.log(`\n✅ Pipeline completed in ${duration}ms`);

      // Display results
      displayPhase1Results(result.searchParams, { queryTranslator: result.executionTime.queryTranslator });
      displayScoutResults(result.candidateRepos || [], result.executionTime.scout || 0);

      // Validate
      console.log(`\n✅ Validation:`);
      const validations = validatePipelineFlow(
        result.searchParams,
        result.candidateRepos,
        { total: duration, queryTranslator: result.executionTime.queryTranslator, scout: result.executionTime.scout },
        { minCandidates: 20, maxExecutionTime: 10000 }
      );
      validations.forEach((v) => console.log(`  ${v.message}`));
    } catch (error) {
      console.error(`\n❌ Pipeline failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
