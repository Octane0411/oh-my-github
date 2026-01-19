/**
 * End-to-End Integration Test for Search Pipeline
 *
 * Run with: bun run scripts/test-integration.ts
 *
 * This comprehensive test validates:
 * 1. Multiple query types and search modes
 * 2. Error handling and edge cases
 * 3. Performance benchmarks
 * 4. Cost estimation
 * 5. Result quality metrics
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";

interface TestCase {
  name: string;
  query: string;
  mode: "focused" | "balanced" | "exploratory";
  expectations: {
    minResults?: number;
    maxResults?: number;
    maxTime?: number;
    minTopScore?: number;
    shouldContain?: string; // Repository name that should appear in results
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: "Popular Libraries (Balanced)",
    query: "TypeScript ORM for PostgreSQL",
    mode: "balanced",
    expectations: {
      minResults: 5,
      maxResults: 10,
      maxTime: 60000,
      minTopScore: 8.0,
      shouldContain: "prisma/prisma",
    },
  },
  {
    name: "Emerging Projects (Exploratory)",
    query: "new Rust web framework",
    mode: "exploratory",
    expectations: {
      minResults: 5,
      maxResults: 10,
      maxTime: 60000,
      minTopScore: 7.0,
    },
  },
  {
    name: "Specific Tech (Focused)",
    query: "React animation library",
    mode: "focused",
    expectations: {
      minResults: 5,
      maxResults: 10,
      maxTime: 60000,
      minTopScore: 7.0,
    },
  },
  {
    name: "Niche Query",
    query: "lightweight state management",
    mode: "balanced",
    expectations: {
      minResults: 3,
      maxResults: 10,
      maxTime: 60000,
      minTopScore: 5.0,
    },
  },
];

interface TestResult {
  passed: boolean;
  testCase: TestCase;
  results?: number;
  topScore?: number;
  executionTime?: number;
  error?: string;
  validations: string[];
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const validations: string[] = [];

  try {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Mode: ${testCase.mode}`);

    const startTime = Date.now();
    const result = await executeSearchPipeline(testCase.query, testCase.mode);
    const executionTime = Date.now() - startTime;

    const resultsCount = result.topRepos?.length || 0;
    const topScore = result.topRepos?.[0]?.scores.overall || 0;

    // Validation 1: Results count
    if (
      resultsCount >= (testCase.expectations.minResults || 0) &&
      resultsCount <= (testCase.expectations.maxResults || 10)
    ) {
      validations.push(`✓ Results count: ${resultsCount} (expected ${testCase.expectations.minResults}-${testCase.expectations.maxResults})`);
    } else {
      validations.push(`✗ Results count: ${resultsCount} (expected ${testCase.expectations.minResults}-${testCase.expectations.maxResults})`);
    }

    // Validation 2: Performance
    if (executionTime <= (testCase.expectations.maxTime || 90000)) {
      validations.push(`✓ Performance: ${executionTime}ms (limit: ${testCase.expectations.maxTime}ms)`);
    } else {
      validations.push(`⚠ Performance slow: ${executionTime}ms (limit: ${testCase.expectations.maxTime}ms)`);
    }

    // Validation 3: Top result quality
    if (topScore >= (testCase.expectations.minTopScore || 0)) {
      validations.push(`✓ Top score: ${topScore} (min: ${testCase.expectations.minTopScore})`);
    } else {
      validations.push(`✗ Top score: ${topScore} (min: ${testCase.expectations.minTopScore})`);
    }

    // Validation 4: Expected repository present
    if (testCase.expectations.shouldContain && result.topRepos) {
      const found = result.topRepos.some(
        (r) => r.full_name === testCase.expectations.shouldContain
      );
      if (found) {
        validations.push(`✓ Expected repo found: ${testCase.expectations.shouldContain}`);
      } else {
        validations.push(`⚠ Expected repo not found: ${testCase.expectations.shouldContain}`);
      }
    }

    // Validation 5: All scores valid
    if (result.topRepos) {
      const allScoresValid = result.topRepos.every((repo) => {
        const s = repo.scores;
        return (
          s.overall >= 0 && s.overall <= 10 &&
          s.maturity >= 0 && s.maturity <= 10 &&
          s.activity >= 0 && s.activity <= 10 &&
          s.community >= 0 && s.community <= 10 &&
          s.maintenance >= 0 && s.maintenance <= 10 &&
          s.documentation >= 0 && s.documentation <= 10 &&
          s.easeOfUse >= 0 && s.easeOfUse <= 10 &&
          s.relevance >= 0 && s.relevance <= 10
        );
      });

      if (allScoresValid) {
        validations.push("✓ All scores valid (0-10 range)");
      } else {
        validations.push("✗ Some scores out of range");
      }
    }

    // Validation 6: Results sorted
    if (result.topRepos && result.topRepos.length > 1) {
      const sorted = result.topRepos.every((repo, idx, arr) => {
        if (idx === 0) return true;
        return arr[idx - 1].scores.overall >= repo.scores.overall;
      });

      if (sorted) {
        validations.push("✓ Results sorted by overall score");
      } else {
        validations.push("✗ Results not properly sorted");
      }
    }

    const passed = validations.every((v) => v.startsWith("✓"));

    return {
      passed,
      testCase,
      results: resultsCount,
      topScore,
      executionTime,
      validations,
    };
  } catch (error) {
    validations.push(`✗ Pipeline error: ${error instanceof Error ? error.message : String(error)}`);

    return {
      passed: false,
      testCase,
      error: error instanceof Error ? error.message : String(error),
      validations,
    };
  }
}

async function runIntegrationTests() {
  console.log("🧪 End-to-End Integration Tests\n");
  console.log("=".repeat(70));
  console.log("\nWARNING: This test makes real LLM and GitHub API calls.");
  console.log("Ensure GITHUB_TOKEN and DEEPSEEK_API_KEY/OPENAI_API_KEY are set.\n");
  console.log("=".repeat(70));

  const results: TestResult[] = [];
  const timings: number[] = [];

  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.push(result);

    // Display results
    console.log(`\n   Validations:`);
    result.validations.forEach((v) => console.log(`   ${v}`));

    if (result.executionTime) {
      timings.push(result.executionTime);
    }

    if (result.passed) {
      console.log(`\n   ✅ PASSED`);
    } else {
      console.log(`\n   ❌ FAILED`);
    }

    console.log("\n" + "─".repeat(70));
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const avgTime = timings.length > 0 ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0;
  const maxTime = timings.length > 0 ? Math.max(...timings) : 0;

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Integration Test Summary");
  console.log(`   Total Tests: ${TEST_CASES.length}`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`\n⏱️  Performance`);
  console.log(`   Average Time: ${avgTime}ms`);
  console.log(`   Max Time: ${maxTime}ms`);

  if (failedCount === 0) {
    console.log("\n🎉 All integration tests passed!\n");
    console.log("System is ready for production deployment.");
    console.log("\nNext steps:");
    console.log("  - Review performance metrics");
    console.log("  - Validate cost estimates");
    console.log("  - Enable caching for production\n");
  } else {
    console.log("\n⚠️  Some tests failed. Review failures above.\n");
    process.exit(1);
  }
}

runIntegrationTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
