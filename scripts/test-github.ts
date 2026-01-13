/**
 * Test script for GitHub data layer validation
 *
 * Usage: bun run scripts/test-github.ts
 */

import { formatRateLimitInfo } from "../lib/github/client";
import { searchRepositories, SearchParams } from "../lib/github/search";
import { extractRepositoryMetadata } from "../lib/github/metadata";

/**
 * Format metadata for display
 */
function formatMetadata(metadata: any): string {
  const lines = [
    `\n${"=".repeat(80)}`,
    `📦 ${metadata.fullName}`,
    `${"=".repeat(80)}`,
    `🔗 ${metadata.url}`,
    `📝 ${metadata.description || "No description"}`,
    ``,
    `⭐ Activity Metrics:`,
    `   Commits (2w/1m/3m): ${metadata.commitActivity.twoWeeks}/${metadata.commitActivity.oneMonth}/${metadata.commitActivity.threeMonths}`,
    `   Avg Issue Response: ${metadata.avgIssueResponseTime ? Math.round(metadata.avgIssueResponseTime) + "h" : "N/A"}`,
    ``,
    `🎯 Contribution Opportunities:`,
    `   Good First Issues: ${metadata.goodFirstIssueCount}`,
    `   Help Wanted: ${metadata.helpWantedCount}`,
    `   Open Issues: ${metadata.openIssuesCount}`,
    ``,
    `🔄 Pull Request Stats (last 50):`,
    `   Total: ${metadata.prStats.total}`,
    `   Merged: ${metadata.prStats.merged} (${metadata.prStats.mergeRate}%)`,
    `   Closed: ${metadata.prStats.closed} (${metadata.prStats.closeRate}%)`,
    `   Stale: ${metadata.prStats.stale} (${metadata.prStats.staleRate}%)`,
    ``,
    `👥 Contributors:`,
    `   Total: ${metadata.contributorStats.totalContributors}`,
    `   External: ${metadata.contributorStats.externalContributors} (${metadata.contributorStats.externalRatio}%)`,
    ``,
    `📚 Documentation:`,
    `   README: ${metadata.documentation.readme ? "✅" : "❌"}`,
    `   CONTRIBUTING: ${metadata.documentation.contributing ? "✅" : "❌"}`,
    `   LICENSE: ${metadata.documentation.license ? "✅" : "❌"}`,
    `   CI/CD: ${metadata.documentation.hasCI ? "✅" : "❌"}`,
    `   Tests: ${metadata.documentation.hasTests ? "✅" : "❌"}`,
    ``,
    `🔧 Complexity:`,
    `   Primary Language: ${metadata.complexity.primaryLanguage || "N/A"}`,
    `   Dependencies: ${metadata.complexity.dependencyCount}`,
    `   Languages: ${Object.keys(metadata.complexity.languages).join(", ") || "N/A"}`,
    `${"=".repeat(80)}\n`,
  ];
  return lines.join("\n");
}

/**
 * Test 1: Search repositories
 */
async function testSearch() {
  console.log("\n🧪 TEST 1: Repository Search");
  console.log("=" .repeat(80));

  const searchParams: SearchParams = {
    keywords: "RAG framework",
    language: "Python",
    minStars: 100,
    maxStars: 5000,
    createdAfter: "2023-01-01",
    maxResults: 10,
  };

  console.log("\nSearch parameters:");
  console.log(JSON.stringify(searchParams, null, 2));

  const results = await searchRepositories(searchParams);

  console.log(`\n✅ Found ${results.length} repositories:\n`);

  results.forEach((repo, index) => {
    console.log(
      `${index + 1}. ${repo.fullName} (⭐ ${repo.stars}, 🍴 ${repo.forks})`
    );
    console.log(`   ${repo.description || "No description"}`);
    console.log(`   Language: ${repo.language || "N/A"}, Topics: ${repo.topics.join(", ") || "None"}`);
    console.log(`   ${repo.url}`);
    console.log();
  });

  return results;
}

/**
 * Test 2: Extract metadata for sample repositories
 */
async function testMetadata(sampleRepos: { owner: string; name: string }[]) {
  console.log("\n🧪 TEST 2: Metadata Extraction");
  console.log("=".repeat(80));

  console.log(`\nExtracting metadata for ${sampleRepos.length} repositories...\n`);

  const metadataResults = [];

  for (const repo of sampleRepos) {
    try {
      const metadata = await extractRepositoryMetadata(repo.owner, repo.name);
      metadataResults.push(metadata);
      console.log(formatMetadata(metadata));
    } catch (error) {
      console.error(`❌ Failed to extract metadata for ${repo.owner}/${repo.name}:`, error);
    }
  }

  return metadataResults;
}

/**
 * Test 3: Rate limit monitoring
 */
async function testRateLimits() {
  console.log("\n🧪 TEST 3: Rate Limit Status");
  console.log("=".repeat(80));

  const rateLimitInfo = await formatRateLimitInfo();
  console.log(`\n${rateLimitInfo}\n`);
}

/**
 * Main test execution
 */
async function main() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                     oh-my-github GitHub Data Layer Test                      ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");

  const startTime = Date.now();

  try {
    // Check initial rate limits
    await testRateLimits();

    // Test 1: Search
    const searchResults = await testSearch();

    // Test 2: Extract metadata for top 3-5 results
    const sampleRepos = searchResults.slice(0, 3).map((repo) => ({
      owner: repo.owner,
      name: repo.name,
    }));

    if (sampleRepos.length > 0) {
      await testMetadata(sampleRepos);
    } else {
      console.log("\n⚠️  No repositories found to test metadata extraction");
    }

    // Check final rate limits
    await testRateLimits();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n╔═══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                              ✅ All Tests Passed                              ║");
    console.log(`║                        Total execution time: ${elapsed}s${" ".repeat(Math.max(0, 25 - elapsed.length))}║`);
    console.log("╚═══════════════════════════════════════════════════════════════════════════════╝\n");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
