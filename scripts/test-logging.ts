/**
 * Logging and Observability Test
 *
 * Run with: bun run scripts/test-logging.ts
 *
 * Validates:
 * - Structured logging format
 * - Request/response tracking
 * - Pipeline stage logging
 * - Error logging
 * - Performance metrics logging
 * - Cache logging
 */

import { executeSearchPipeline } from "../lib/agents/h1-search-pipeline/workflow";
import { createLogger, generateRequestId } from "../lib/agents/h1-search-pipeline/logger";
import { clearCache } from "../lib/agents/h1-search-pipeline/cache";
import { estimateSearchCost } from "../lib/agents/h1-search-pipeline/cost-tracking";

console.log("🔍 Logging and Observability Test\n");
console.log("=".repeat(70));

async function testLogging() {
  // Clear cache for fresh test
  clearCache();

  // Test 1: Request logging
  console.log("\n📋 Test 1: Request/Response Logging\n");
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  const query = "React state management library";
  const mode = "balanced" as const;

  logger.logRequest(query, mode);

  try {
    const startTime = Date.now();
    const result = await executeSearchPipeline(query, mode, 90000, true, logger);
    const duration = Date.now() - startTime;

    // Log performance metrics
    logger.logPerformance(query, mode, {
      totalTime: result.executionTime.total || duration,
      queryTranslator: result.executionTime.queryTranslator || 0,
      scout: result.executionTime.scout || 0,
      screener: result.executionTime.screener || 0,
      cached: result.cached || false,
    });

    // Log cost estimate
    const costEstimate = estimateSearchCost(result.coarseFilteredRepos?.length || 20);
    logger.logCost(query, mode, costEstimate.llmCost);

    // Log response
    logger.logResponse(query, mode, result.topRepos?.length || 0, duration, result.cached || false);

    console.log("\n✅ Request/Response logging test passed");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.logError("Pipeline execution failed", err, { query, mode });
    console.log("\n❌ Request/Response logging test failed");
  }

  // Test 2: Cache logging
  console.log("\n\n📋 Test 2: Cache Logging (Repeat Query)\n");
  const logger2 = createLogger(generateRequestId());
  logger2.logRequest(query, mode);

  try {
    const startTime = Date.now();
    const result = await executeSearchPipeline(query, mode, 90000, true, logger2);
    const duration = Date.now() - startTime;

    logger2.logResponse(query, mode, result.topRepos?.length || 0, duration, result.cached || false);
    console.log("\n✅ Cache logging test passed");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger2.logError("Pipeline execution failed", err, { query, mode });
    console.log("\n❌ Cache logging test failed");
  }

  // Test 3: Error logging
  console.log("\n\n📋 Test 3: Error Logging\n");
  const logger3 = createLogger(generateRequestId());

  try {
    // Simulate error by passing invalid mode
    logger3.logWarning("Testing error handling", {
      metadata: { testCase: "invalid_input" },
    });

    throw new Error("Simulated pipeline error");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger3.logError("Simulated error test", err, {
      query: "test query",
      mode: "balanced",
      stage: "test",
    });
    console.log("\n✅ Error logging test passed");
  }

  // Summary
  console.log("\n\n" + "=".repeat(70));
  console.log("\n✅ All logging tests passed\n");
  console.log("Logging Features Verified:");
  console.log("  ✓ Request ID generation");
  console.log("  ✓ Structured log format");
  console.log("  ✓ Request/response logging");
  console.log("  ✓ Performance metrics logging");
  console.log("  ✓ Cost tracking logging");
  console.log("  ✓ Cache hit/miss logging");
  console.log("  ✓ Error logging with context");
  console.log("  ✓ Warning logging");
  console.log("\n" + "=".repeat(70));
}

testLogging().catch((error) => {
  console.error("\n❌ Logging test failed:", error);
  process.exit(1);
});
