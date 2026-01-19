/**
 * Test script for Phase 4: Metadata-Based Scoring
 *
 * Run with: bun run scripts/test-phase4-scoring.ts
 *
 * This script validates:
 * 1. All 4 metadata-based scoring dimensions work correctly
 * 2. Scores are in valid range (0-10)
 * 3. Scores make sense for different repo profiles
 */

import {
  calculateMaturity,
  calculateActivity,
  calculateCommunity,
  calculateMaintenance,
  calculateMetadataScores,
} from "../lib/agents/h1-search-pipeline/scoring/dimensions";
import type { Repository } from "../lib/agents/h1-search-pipeline/types";

/**
 * Mock repositories with different profiles
 */
const TEST_REPOS: Array<{ name: string; repo: Repository; expectations: any }> =
  [
    {
      name: "Highly Popular & Active (React)",
      repo: {
        full_name: "facebook/react",
        name: "react",
        owner: "facebook",
        description: "A JavaScript library for building user interfaces",
        stars: 230000,
        forks: 47000,
        language: "JavaScript",
        topics: ["react", "javascript"],
        created_at: "2013-05-24T16:15:54Z", // ~11 years old
        updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        pushed_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        has_readme: true,
        is_archived: false,
        is_fork: false,
        license: "MIT",
        open_issues_count: 800,
        default_branch: "main",
        html_url: "https://github.com/facebook/react",
      } as Repository,
      expectations: {
        maturityMin: 8,
        activityMin: 7,
        communityMin: 8,
        maintenanceMin: 7,
      },
    },
    {
      name: "Emerging Project (< 1 year, active)",
      repo: {
        full_name: "newcorp/cool-lib",
        name: "cool-lib",
        owner: "newcorp",
        description: "A new cool library",
        stars: 500,
        forks: 30,
        language: "TypeScript",
        topics: ["library"],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200).toISOString(), // 200 days old
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        has_readme: true,
        is_archived: false,
        is_fork: false,
        license: "MIT",
        open_issues_count: 15,
        default_branch: "main",
        html_url: "https://github.com/newcorp/cool-lib",
      } as Repository,
      expectations: {
        maturityMax: 5, // Young project
        activityMin: 5, // Recently active
        communityMin: 4,
        maintenanceMin: 5,
      },
    },
    {
      name: "Archived Project",
      repo: {
        full_name: "oldcorp/legacy-lib",
        name: "legacy-lib",
        owner: "oldcorp",
        description: "An archived library",
        stars: 5000,
        forks: 800,
        language: "JavaScript",
        topics: [],
        created_at: "2015-01-01T00:00:00Z", // ~10 years old
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 730).toISOString(), // 2 years ago
        pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 730).toISOString(),
        has_readme: true,
        is_archived: true,
        is_fork: false,
        license: "MIT",
        open_issues_count: 50,
        default_branch: "master",
        html_url: "https://github.com/oldcorp/legacy-lib",
      } as Repository,
      expectations: {
        maturityMin: 6, // Old project
        activityMax: 2, // Not active
        maintenanceExpect: 0, // Archived
      },
    },
  ];

async function runTests() {
  console.log("🧪 Phase 4: Metadata-Based Scoring Test\n");
  console.log("=".repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of TEST_REPOS) {
    console.log(`\n📝 ${test.name}`);
    console.log(`Repo: ${test.repo.full_name}`);
    console.log(`  Stars: ${test.repo.stars.toLocaleString()}, Forks: ${test.repo.forks.toLocaleString()}`);
    console.log(`  Created: ${test.repo.created_at.split("T")[0]}`);
    console.log(`  Last Update: ${test.repo.pushed_at.split("T")[0]}`);
    console.log(`  Archived: ${test.repo.is_archived}`);

    try {
      // Calculate all metadata scores
      const scores = calculateMetadataScores(test.repo);

      console.log(`\n📊 Calculated Scores:`);
      console.log(`  Maturity:    ${scores.maturity?.toFixed(1)}/10`);
      console.log(`  Activity:    ${scores.activity?.toFixed(1)}/10`);
      console.log(`  Community:   ${scores.community?.toFixed(1)}/10`);
      console.log(`  Maintenance: ${scores.maintenance?.toFixed(1)}/10`);

      // Validation
      console.log(`\n✅ Validation:`);
      const validations: string[] = [];

      // Check all scores are in valid range
      const allInRange = Object.values(scores).every(
        (score) => score !== undefined && score >= 0 && score <= 10
      );
      if (allInRange) {
        validations.push("  ✓ All scores in valid range (0-10)");
      } else {
        validations.push("  ✗ Some scores out of range");
      }

      // Check scores have 1 decimal precision
      const allPrecise = Object.values(scores).every((score) => {
        if (score === undefined) return false;
        return score === Math.round(score * 10) / 10;
      });
      if (allPrecise) {
        validations.push("  ✓ All scores have 1 decimal precision");
      } else {
        validations.push("  ✗ Some scores have incorrect precision");
      }

      // Check expectations
      if (test.expectations.maturityMin && scores.maturity) {
        if (scores.maturity >= test.expectations.maturityMin) {
          validations.push(
            `  ✓ Maturity meets minimum (${scores.maturity} >= ${test.expectations.maturityMin})`
          );
        } else {
          validations.push(
            `  ✗ Maturity below expected (${scores.maturity} < ${test.expectations.maturityMin})`
          );
        }
      }

      if (test.expectations.maturityMax && scores.maturity) {
        if (scores.maturity <= test.expectations.maturityMax) {
          validations.push(
            `  ✓ Maturity within maximum (${scores.maturity} <= ${test.expectations.maturityMax})`
          );
        } else {
          validations.push(
            `  ✗ Maturity above expected (${scores.maturity} > ${test.expectations.maturityMax})`
          );
        }
      }

      if (test.expectations.activityMin && scores.activity) {
        if (scores.activity >= test.expectations.activityMin) {
          validations.push(
            `  ✓ Activity meets minimum (${scores.activity} >= ${test.expectations.activityMin})`
          );
        } else {
          validations.push(
            `  ✗ Activity below expected (${scores.activity} < ${test.expectations.activityMin})`
          );
        }
      }

      if (test.expectations.activityMax && scores.activity) {
        if (scores.activity <= test.expectations.activityMax) {
          validations.push(
            `  ✓ Activity within maximum (${scores.activity} <= ${test.expectations.activityMax})`
          );
        } else {
          validations.push(
            `  ✗ Activity above expected (${scores.activity} > ${test.expectations.activityMax})`
          );
        }
      }

      if (test.expectations.communityMin && scores.community) {
        if (scores.community >= test.expectations.communityMin) {
          validations.push(
            `  ✓ Community meets minimum (${scores.community} >= ${test.expectations.communityMin})`
          );
        } else {
          validations.push(
            `  ✗ Community below expected (${scores.community} < ${test.expectations.communityMin})`
          );
        }
      }

      if (test.expectations.maintenanceMin && scores.maintenance) {
        if (scores.maintenance >= test.expectations.maintenanceMin) {
          validations.push(
            `  ✓ Maintenance meets minimum (${scores.maintenance} >= ${test.expectations.maintenanceMin})`
          );
        } else {
          validations.push(
            `  ✗ Maintenance below expected (${scores.maintenance} < ${test.expectations.maintenanceMin})`
          );
        }
      }

      if (
        test.expectations.maintenanceExpect !== undefined &&
        scores.maintenance !== undefined
      ) {
        if (scores.maintenance === test.expectations.maintenanceExpect) {
          validations.push(
            `  ✓ Maintenance matches expected (${scores.maintenance} === ${test.expectations.maintenanceExpect})`
          );
        } else {
          validations.push(
            `  ✗ Maintenance doesn't match (${scores.maintenance} !== ${test.expectations.maintenanceExpect})`
          );
        }
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
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
      failedTests++;
    }

    console.log("─".repeat(70));
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${TEST_REPOS.length}`);
  console.log(`   Failed: ${failedTests}/${TEST_REPOS.length}`);

  if (failedTests === 0) {
    console.log("\n🎉 All tests passed! Metadata-based scoring works correctly.\n");
  } else {
    console.log(
      "\n⚠️  Some tests failed. Please review the failures above.\n"
    );
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
