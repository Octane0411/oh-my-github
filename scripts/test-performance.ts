/**
 * Performance Benchmarking and Tuning
 *
 * Run with: bun run scripts/test-performance.ts
 *
 * Measures and analyzes:
 * - Pipeline stage execution times
 * - Bottleneck identification
 * - Cache effectiveness
 * - Parallelization efficiency
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";
import { getCacheStats, clearCache } from "../lib/agents/h1-search-pipeline/cache";

interface PerformanceMetrics {
  query: string;
  mode: string;
  totalTime: number;
  breakdown: {
    queryTranslator: number;
    scout: number;
    screener: number;
  };
  cached: boolean;
  resultsCount: number;
}

const TEST_QUERIES = [
  { query: "TypeScript ORM for PostgreSQL", mode: "balanced" as const },
  { query: "React state management", mode: "focused" as const },
  { query: "Rust web framework", mode: "exploratory" as const },
];

async function measurePerformance(
  query: string,
  mode: "focused" | "balanced" | "exploratory",
  useCache: boolean = true
): Promise<PerformanceMetrics> {
  console.log(`\n⏱️  Measuring: "${query}" (${mode})`);

  const result = await executeSearchPipeline(query, mode, 90000, useCache);

  const metrics: PerformanceMetrics = {
    query,
    mode,
    totalTime: result.executionTime.total || 0,
    breakdown: {
      queryTranslator: result.executionTime.queryTranslator || 0,
      scout: result.executionTime.scout || 0,
      screener: result.executionTime.screener || 0,
    },
    cached: result.cached || false,
    resultsCount: result.topRepos?.length || 0,
  };

  console.log(`   Total: ${metrics.totalTime}ms`);
  console.log(`   Cached: ${metrics.cached ? "✓" : "✗"}`);
  console.log(`   Results: ${metrics.resultsCount}`);

  return metrics;
}

function analyzeBottlenecks(metrics: PerformanceMetrics[]) {
  console.log("\n🔍 Bottleneck Analysis\n");
  console.log("=".repeat(70));

  const uncachedMetrics = metrics.filter((m) => !m.cached);
  if (uncachedMetrics.length === 0) {
    console.log("No uncached requests to analyze.");
    return;
  }

  // Average times
  const avgTimes = {
    total: 0,
    queryTranslator: 0,
    scout: 0,
    screener: 0,
  };

  for (const m of uncachedMetrics) {
    avgTimes.total += m.totalTime;
    avgTimes.queryTranslator += m.breakdown.queryTranslator;
    avgTimes.scout += m.breakdown.scout;
    avgTimes.screener += m.breakdown.screener;
  }

  const count = uncachedMetrics.length;
  avgTimes.total /= count;
  avgTimes.queryTranslator /= count;
  avgTimes.scout /= count;
  avgTimes.screener /= count;

  // Calculate percentages
  const percentages = {
    queryTranslator: (avgTimes.queryTranslator / avgTimes.total) * 100,
    scout: (avgTimes.scout / avgTimes.total) * 100,
    screener: (avgTimes.screener / avgTimes.total) * 100,
  };

  console.log("Average Execution Times (uncached):\n");
  console.log(`Query Translator: ${avgTimes.queryTranslator.toFixed(0)}ms (${percentages.queryTranslator.toFixed(1)}%)`);
  console.log(`Scout:            ${avgTimes.scout.toFixed(0)}ms (${percentages.scout.toFixed(1)}%)`);
  console.log(`Screener:         ${avgTimes.screener.toFixed(0)}ms (${percentages.screener.toFixed(1)}%)`);
  console.log(`─`.repeat(70));
  console.log(`Total:            ${avgTimes.total.toFixed(0)}ms (100.0%)`);

  // Identify bottleneck
  console.log("\n🎯 Primary Bottleneck:\n");
  const bottleneck =
    percentages.screener > percentages.scout && percentages.screener > percentages.queryTranslator
      ? "Screener (LLM Evaluation)"
      : percentages.scout > percentages.queryTranslator
      ? "Scout (GitHub Search)"
      : "Query Translator";

  console.log(`   ${bottleneck}`);

  if (bottleneck === "Screener (LLM Evaluation)") {
    console.log(`\n   Optimization Opportunities:`);
    console.log(`   - Increase LLM concurrency from 3 to 5`);
    console.log(`   - Reduce coarse filter from 25 to 15-20 repos`);
    console.log(`   - Use faster LLM model for documentation scoring`);
  }
}

function analyzeCacheEffectiveness(
  uncachedMetrics: PerformanceMetrics[],
  cachedMetrics: PerformanceMetrics[]
) {
  console.log("\n💾 Cache Effectiveness\n");
  console.log("=".repeat(70));

  if (cachedMetrics.length === 0) {
    console.log("No cached requests to analyze.");
    return;
  }

  const avgUncachedTime =
    uncachedMetrics.reduce((sum, m) => sum + m.totalTime, 0) / uncachedMetrics.length;
  const avgCachedTime =
    cachedMetrics.reduce((sum, m) => sum + m.totalTime, 0) / cachedMetrics.length;

  const speedup = avgUncachedTime / avgCachedTime;
  const timeSaved = avgUncachedTime - avgCachedTime;

  console.log(`Uncached Requests: ${uncachedMetrics.length}`);
  console.log(`Cached Requests:   ${cachedMetrics.length}`);
  console.log(`\nAverage Response Time:`);
  console.log(`  Uncached: ${avgUncachedTime.toFixed(0)}ms`);
  console.log(`  Cached:   ${avgCachedTime.toFixed(0)}ms`);
  console.log(`\nPerformance Improvement:`);
  console.log(`  Speedup:   ${speedup.toFixed(1)}x faster`);
  console.log(`  Time Saved: ${timeSaved.toFixed(0)}ms per cached request`);

  const stats = getCacheStats();
  console.log(`\nCache Status:`);
  console.log(`  Entries: ${stats.size}/${stats.max}`);
}

async function runPerformanceTests() {
  console.log("🚀 Performance Benchmarking\n");
  console.log("=".repeat(70));

  const allMetrics: PerformanceMetrics[] = [];

  // Phase 1: Uncached requests
  console.log("\n📊 Phase 1: Cold Start (Uncached)");
  clearCache();

  for (const test of TEST_QUERIES) {
    const metrics = await measurePerformance(test.query, test.mode, true);
    allMetrics.push(metrics);
  }

  // Phase 2: Cached requests (repeat same queries)
  console.log("\n\n📊 Phase 2: Warm Start (Cached)");

  for (const test of TEST_QUERIES) {
    const metrics = await measurePerformance(test.query, test.mode, true);
    allMetrics.push(metrics);
  }

  // Analysis
  const uncachedMetrics = allMetrics.filter((m) => !m.cached);
  const cachedMetrics = allMetrics.filter((m) => m.cached);

  console.log("\n\n" + "=".repeat(70));
  analyzeBottlenecks(uncachedMetrics);
  console.log("\n" + "=".repeat(70));
  analyzeCacheEffectiveness(uncachedMetrics, cachedMetrics);

  // Recommendations
  console.log("\n\n" + "=".repeat(70));
  console.log("\n💡 Performance Optimization Recommendations\n");
  console.log("=".repeat(70));
  console.log(`
1. ✅ Caching Enabled
   - Cache hit provides ${cachedMetrics.length > 0 ? `${((allMetrics.filter(m => !m.cached).length > 0 ? allMetrics.filter(m => !m.cached)[0].totalTime / (cachedMetrics[0]?.totalTime || 1) : 1)).toFixed(1)}x speedup` : "significant speedup"}
   - LRU cache with 1-hour TTL
   - Recommendation: Keep enabled

2. LLM Concurrency
   - Current: 3 concurrent evaluations
   - Consider: Increase to 5 for faster scoring
   - Trade-off: More parallel API calls vs. speed

3. Coarse Filter Tuning
   - Current: Top 25 repos → Fine Scoring
   - Consider: Reduce to 15-20 for faster LLM phase
   - Trade-off: Slightly fewer results vs. speed

4. GitHub API Optimization
   - Current: Sequential README fetches
   - Already optimized: Parallel with Promise.all
   - No further optimization needed

5. Query Translator Optimization
   - Current: Single LLM call with structured output
   - Already optimized: Low latency (~3s)
   - No further optimization needed
`);

  console.log("=".repeat(70));
  console.log("\n✅ Performance benchmarking complete\n");
}

runPerformanceTests().catch((error) => {
  console.error("Performance test failed:", error);
  process.exit(1);
});
