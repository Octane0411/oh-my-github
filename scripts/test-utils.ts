/**
 * Shared Test Utilities
 *
 * Common utilities for test scripts across all phases.
 * Provides console formatting, validation helpers, and test runner infrastructure.
 */

export interface Repository {
  full_name: string;
  owner: string;
  stars: number;
  language: string | null;
  description?: string;
  updated_at?: string;
}

export interface TestCase<T> {
  name: string;
  input: T;
  expectations: Record<string, unknown>;
}

export interface ValidationResult {
  passed: boolean;
  message: string;
}

// Console Formatting
export function formatHeader(title: string): void {
  console.log(`\n${title}\n`);
  console.log("=".repeat(70));
}

export function formatSection(name: string): void {
  console.log(`\n📝 ${name}`);
  console.log("─".repeat(70));
}

export function formatSeparator(): void {
  console.log("\n" + "─".repeat(70));
}

export function formatSummary(passed: number, total: number, title: string): void {
  console.log("\n" + "=".repeat(70));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log(`\n🎉 All tests passed! ${title}\n`);
  } else {
    console.log(`\n⚠️  Some tests failed.\n`);
  }
}

// Validation Helpers
export function validateRequiredFields(
  repos: Repository[],
  requiredFields: (keyof Repository)[] = ["full_name", "owner", "stars"]
): ValidationResult {
  const missing = repos.filter((r) =>
    requiredFields.some((f) => r[f] === undefined || r[f] === null || r[f] === "")
  );
  if (missing.length === 0) {
    return { passed: true, message: "✓ All results have required fields" };
  }
  return { passed: false, message: `✗ ${missing.length} results missing required fields` };
}

export function validateResultCount(
  count: number,
  min: number,
  max: number
): ValidationResult {
  if (count >= min && count <= max) {
    return {
      passed: true,
      message: `✓ Result count OK: ${count} (expected ${min}-${max})`,
    };
  }
  return {
    passed: false,
    message: `✗ Result count out of range: ${count} (expected ${min}-${max})`,
  };
}

export function validateStarThreshold(
  repos: Repository[],
  minStars: number
): ValidationResult {
  const belowThreshold = repos.filter((r) => r.stars < minStars);
  if (belowThreshold.length === 0) {
    return {
      passed: true,
      message: `✓ All results meet star requirement (${minStars}+)`,
    };
  }
  return {
    passed: false,
    message: `✗ ${belowThreshold.length} results below star threshold`,
  };
}

export function checkDuplicates(repos: Repository[]): ValidationResult {
  const unique = new Set(repos.map((r) => r.full_name));
  if (unique.size === repos.length) {
    return { passed: true, message: "✓ No duplicate repositories" };
  }
  return {
    passed: false,
    message: `✗ Found ${repos.length - unique.size} duplicates`,
  };
}

export function validatePerformance(
  duration: number,
  thresholdMs: number
): ValidationResult {
  if (duration < thresholdMs) {
    return { passed: true, message: `✓ Performance good: ${duration}ms (< ${thresholdMs}ms)` };
  }
  return { passed: false, message: `⚠ Performance slow: ${duration}ms (> ${thresholdMs}ms)` };
}

// Test Runner Infrastructure
export class TestRunner {
  private passed = 0;
  private failed = 0;
  private tests: Array<{ name: string; passed: boolean }> = [];

  async runTest<T>(
    name: string,
    testFn: () => Promise<unknown> | unknown
  ): Promise<void> {
    console.log(`\n📝 ${name}`);
    try {
      await testFn();
      this.passed++;
      this.tests.push({ name, passed: true });
      console.log(`✅ ${name} PASSED`);
    } catch (error) {
      this.failed++;
      this.tests.push({ name, passed: false });
      console.error(
        `❌ ${name} FAILED: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    console.log("─".repeat(70));
  }

  summary(total: number, title: string): void {
    console.log("\n" + "=".repeat(70));
    console.log(`\n📊 Test Summary:`);
    console.log(`   Passed: ${this.passed}/${total}`);
    console.log(`   Failed: ${this.failed}/${total}`);

    if (this.failed === 0) {
      console.log(`\n🎉 All tests passed! ${title}\n`);
    } else {
      console.log(`\n⚠️  Some tests failed.\n`);
      process.exit(1);
    }
  }
}

// Display Helpers
export function displayResults(
  repos: Repository[],
  options: { title?: string; limit?: number; showDescription?: boolean } = {}
): void {
  const { title = "Results", limit = 5, showDescription = false } = options;
  console.log(`\n${title}: ${repos.length} repositories found`);

  if (repos.length === 0) return;

  console.log(`\nTop ${limit} Results:`);
  repos.slice(0, limit).forEach((repo, idx) => {
    console.log(`  ${idx + 1}. ${repo.full_name} (⭐ ${repo.stars.toLocaleString()})`);
    if (showDescription && repo.description) {
      console.log(`     ${repo.description.slice(0, 80)}...`);
    }
  });
}

export function displaySearchParams(params: {
  keywords: string[];
  expanded_keywords: string[];
  language?: string | null;
  starRange?: { min: number; max?: number };
  topics?: string[];
}): void {
  console.log("\nExtracted Parameters:");
  console.log(`  Keywords: ${params.keywords.join(", ")}`);
  console.log(
    `  Expanded Keywords: ${params.expanded_keywords.join(", ") || "(none)"}`
  );
  console.log(`  Language: ${params.language || "(not specified)"}`);
  console.log(
    `  Star Range: min=${params.starRange?.min}, max=${params.starRange?.max || "∞"}`
  );
  console.log(`  Topics: ${params.topics?.join(", ") || "(none)"}`);
}
