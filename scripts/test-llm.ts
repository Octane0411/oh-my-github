#!/usr/bin/env bun

/**
 * Test script for LLM analysis pipeline
 * Tests the integration with sample repository metadata
 */

import { analyzeRepository, filterContributionIssues } from "../lib/analysis.ts";
import type { RepositoryMetadata, IssueData } from "../lib/analysis.ts";
import type { CalculatedMetrics } from "../lib/reports/generator.ts";

/**
 * Sample repository data for testing
 */
const SAMPLE_REPOS: Array<{
  metadata: RepositoryMetadata;
  metrics: CalculatedMetrics;
  issues: IssueData[];
}> = [
  {
    metadata: {
      full_name: "facebook/react",
      stargazers_count: 230000,
      forks_count: 47000,
      language: "JavaScript",
      license: { name: "MIT" },
      updated_at: "2024-01-10T00:00:00Z",
      open_issues_count: 1200,
      description: "The library for web and native user interfaces",
    },
    metrics: {
      prMergeRate: 0.85,
      avgIssueResponseTime: "3 days",
      avgPRResponseTime: "5 days",
      recentCommitCount: 150,
      openPRCount: 80,
      contributorCount: 1500,
    },
    issues: [
      {
        number: 27890,
        title: "Add support for custom error boundaries",
        labels: ["good first issue", "help wanted"],
        created_at: "2024-01-05T00:00:00Z",
        state: "open",
      },
      {
        number: 27891,
        title: "Improve TypeScript definitions for hooks",
        labels: ["TypeScript", "enhancement"],
        created_at: "2024-01-08T00:00:00Z",
        state: "open",
      },
      {
        number: 27892,
        title: "Documentation: Update getting started guide",
        labels: ["documentation", "good first issue"],
        created_at: "2024-01-09T00:00:00Z",
        state: "open",
      },
    ],
  },
  {
    metadata: {
      full_name: "microsoft/vscode",
      stargazers_count: 165000,
      forks_count: 29000,
      language: "TypeScript",
      license: { name: "MIT" },
      updated_at: "2024-01-11T00:00:00Z",
      open_issues_count: 6500,
      description: "Visual Studio Code",
    },
    metrics: {
      prMergeRate: 0.72,
      avgIssueResponseTime: "7 days",
      avgPRResponseTime: "10 days",
      recentCommitCount: 300,
      openPRCount: 120,
      contributorCount: 2000,
    },
    issues: [
      {
        number: 202345,
        title: "Feature request: Add vim keybindings for terminal",
        labels: ["feature-request", "terminal"],
        created_at: "2024-01-03T00:00:00Z",
        state: "open",
      },
      {
        number: 202346,
        title: "Bug: Syntax highlighting broken for JSX",
        labels: ["bug", "editor"],
        created_at: "2024-01-07T00:00:00Z",
        state: "open",
      },
      {
        number: 202347,
        title: "Improve accessibility of quick pick menu",
        labels: ["accessibility", "good first issue"],
        created_at: "2024-01-10T00:00:00Z",
        state: "open",
      },
    ],
  },
  {
    metadata: {
      full_name: "denoland/deno",
      stargazers_count: 95000,
      forks_count: 5200,
      language: "Rust",
      license: { name: "MIT" },
      updated_at: "2024-01-12T00:00:00Z",
      open_issues_count: 850,
      description: "A modern runtime for JavaScript and TypeScript",
    },
    metrics: {
      prMergeRate: 0.90,
      avgIssueResponseTime: "2 days",
      avgPRResponseTime: "3 days",
      recentCommitCount: 80,
      openPRCount: 45,
      contributorCount: 800,
    },
    issues: [
      {
        number: 21567,
        title: "Add support for Node.js compatibility layer",
        labels: ["enhancement"],
        created_at: "2024-01-01T00:00:00Z",
        state: "open",
      },
      {
        number: 21568,
        title: "Documentation: Getting started with Deno Fresh",
        labels: ["documentation", "beginner-friendly"],
        created_at: "2024-01-06T00:00:00Z",
        state: "open",
      },
      {
        number: 21569,
        title: "Fix: HTTP server memory leak",
        labels: ["bug", "http"],
        created_at: "2024-01-11T00:00:00Z",
        state: "open",
      },
    ],
  },
];

/**
 * Runs analysis on all sample repositories
 */
async function testAllRepositories() {
  console.log("🧪 Testing LLM Analysis Pipeline\n");
  console.log("=" .repeat(60));

  for (let i = 0; i < SAMPLE_REPOS.length; i++) {
    const repo = SAMPLE_REPOS[i];
    console.log(`\n📦 Test ${i + 1}/${SAMPLE_REPOS.length}: ${repo.metadata.full_name}`);
    console.log("-".repeat(60));

    try {
      const result = await analyzeRepository(
        repo.metadata,
        repo.metrics,
        repo.issues,
        {
          detailLevel: "detailed",
          reportFormat: "markdown",
          includeMetrics: true,
        }
      );

      console.log("\n✅ Analysis completed successfully");
      console.log(`📊 Token usage: ${result.tokenUsage.totalTokens} tokens`);
      console.log(`💰 Estimated cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);

      // Validation results
      if (result.validation.isValid) {
        console.log("✅ Report validation passed");
      } else {
        console.log("❌ Report validation failed:");
        result.validation.errors.forEach((err) => console.log(`  - ${err}`));
      }

      if (result.validation.warnings.length > 0) {
        console.log("⚠️  Warnings:");
        result.validation.warnings.forEach((warn) =>
          console.log(`  - ${warn}`)
        );
      }

      // Save report to file
      const filename = `test-report-${repo.metadata.full_name.replace("/", "-")}.md`;
      await Bun.write(filename, result.report.content);
      console.log(`💾 Report saved to: ${filename}`);
    } catch (error) {
      console.error("❌ Analysis failed:");
      console.error(error);
    }

    console.log("\n");
  }

  console.log("=" .repeat(60));
  console.log("✨ Testing complete!");
}

/**
 * Tests brief analysis mode
 */
async function testBriefAnalysis() {
  console.log("\n🧪 Testing Brief Analysis Mode\n");
  console.log("=" .repeat(60));

  const repo = SAMPLE_REPOS[0];
  console.log(`📦 Repository: ${repo.metadata.full_name}`);

  try {
    const result = await analyzeRepository(
      repo.metadata,
      repo.metrics,
      repo.issues,
      {
        detailLevel: "brief",
        reportFormat: "markdown",
        includeMetrics: false,
      }
    );

    console.log("\n✅ Brief analysis completed");
    console.log(`📊 Token usage: ${result.tokenUsage.totalTokens} tokens`);
    console.log(`💰 Estimated cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);

    const filename = `test-report-brief.md`;
    await Bun.write(filename, result.report.content);
    console.log(`💾 Report saved to: ${filename}`);
  } catch (error) {
    console.error("❌ Brief analysis failed:");
    console.error(error);
  }
}

/**
 * Tests issue filtering logic
 */
function testIssueFiltering() {
  console.log("\n🧪 Testing Issue Filtering\n");
  console.log("=" .repeat(60));

  SAMPLE_REPOS.forEach((repo) => {
    console.log(`\n📦 Repository: ${repo.metadata.full_name}`);
    const filtered = filterContributionIssues(repo.issues);
    console.log(`  Issues (total): ${repo.issues.length}`);
    console.log(`  Issues (filtered): ${filtered.length}`);
    filtered.forEach((issue) => {
      console.log(`    #${issue.number}: ${issue.title}`);
      console.log(`      Labels: ${issue.labels.join(", ") || "none"}`);
    });
  });
}

/**
 * Main test execution
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "all";

  try {
    switch (mode) {
      case "all":
        await testAllRepositories();
        break;
      case "brief":
        await testBriefAnalysis();
        break;
      case "filter":
        testIssueFiltering();
        break;
      case "single":
        const repoIndex = parseInt(args[1] || "0");
        if (repoIndex >= 0 && repoIndex < SAMPLE_REPOS.length) {
          const repo = SAMPLE_REPOS[repoIndex];
          console.log(`🧪 Testing single repository: ${repo.metadata.full_name}\n`);
          const result = await analyzeRepository(
            repo.metadata,
            repo.metrics,
            repo.issues
          );
          console.log("\n✅ Analysis completed");
          console.log(`📊 Token usage: ${result.tokenUsage.totalTokens} tokens`);
          console.log(`💰 Estimated cost: $${result.tokenUsage.estimatedCost.toFixed(4)}`);
          const filename = `test-report-single.md`;
          await Bun.write(filename, result.report.content);
          console.log(`💾 Report saved to: ${filename}`);
        } else {
          console.error(`Invalid repository index: ${repoIndex}`);
          process.exit(1);
        }
        break;
      default:
        console.log("Usage: bun scripts/test-llm.ts [mode] [options]");
        console.log("\nModes:");
        console.log("  all     - Test all sample repositories (default)");
        console.log("  brief   - Test brief analysis mode");
        console.log("  filter  - Test issue filtering only");
        console.log("  single [index] - Test single repository by index (0-2)");
        process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Test execution failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
