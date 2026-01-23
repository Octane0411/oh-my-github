#!/usr/bin/env tsx
/**
 * Manual test script for H2 Discovery Pipeline
 *
 * Usage:
 *   npm run dev  # Start the server in another terminal
 *   tsx scripts/test-h2-discovery.ts
 *
 * Or test the workflow directly:
 *   tsx scripts/test-h2-discovery.ts --direct
 */

import { executeH2Discovery } from '../lib/agents/h2-skill-discovery/workflow';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDirectWorkflow() {
  log('bright', '\n=== Testing H2 Discovery Workflow Directly ===\n');

  const testCases = [
    {
      query: 'Python PDF table extraction',
      language: 'python',
      toolType: 'library' as const,
    },
    {
      query: 'React animation library',
      language: 'javascript',
      toolType: 'library' as const,
    },
    {
      query: 'Rust CLI tool for JSON formatting',
      language: 'rust',
      toolType: 'cli' as const,
    },
  ];

  for (const testCase of testCases) {
    log('blue', `\nTest: ${testCase.query}`);
    log('yellow', `Language: ${testCase.language}, Tool Type: ${testCase.toolType}\n`);

    try {
      const result = await executeH2Discovery(
        testCase.query,
        testCase.language,
        testCase.toolType
      );

      log('green', `✓ Success!`);
      log('bright', `  Stage: ${result.stage}`);
      log('bright', `  Found: ${result.scoredRepositories.length} repositories`);
      log('bright', `  Cost: $${result.costTracking?.estimatedCost.toFixed(4)}`);
      log('bright', `  LLM Calls: ${result.costTracking?.llmCalls}`);

      if (result.errors && result.errors.length > 0) {
        log('red', `  Errors: ${result.errors.join(', ')}`);
      }

      if (result.scoredRepositories.length > 0) {
        log('bright', '\n  Top 3 Results:');
        result.scoredRepositories.slice(0, 3).forEach((scored, i) => {
          console.log(`    ${i + 1}. ${scored.repo.full_name}`);
          console.log(`       ACS Score: ${scored.acsScore.total}/100 (${scored.acsScore.recommendation})`);
          console.log(`       Strategy: ${scored.acsScore.skill_strategy}`);
          console.log(`       Stars: ${scored.repo.stars}`);
          console.log(`       Reasoning: ${scored.reasoningText.slice(0, 100)}...`);
        });
      }
    } catch (error) {
      log('red', `✗ Failed: ${(error as Error).message}`);
      console.error(error);
    }

    log('bright', '\n' + '─'.repeat(80));
  }
}

async function testAPIEndpoint() {
  log('bright', '\n=== Testing H2 Discovery API Endpoint ===\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  const testCase = {
    query: 'Python PDF extraction',
    language: 'python',
    toolType: 'library',
  };

  log('blue', `Sending request to ${baseUrl}/api/search/h2-discovery`);
  log('yellow', `Query: ${testCase.query}\n`);

  try {
    const response = await fetch(`${baseUrl}/api/search/h2-discovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    log('green', `✓ API call successful!`);
    log('bright', `  Found: ${result.repositories.length} repositories`);
    log('bright', `  Duration: ${result.metadata.duration}ms`);
    log('bright', `  Cost: $${result.metadata.cost.toFixed(4)}`);

    if (result.repositories.length > 0) {
      log('bright', '\n  Top 3 Results:');
      result.repositories.slice(0, 3).forEach((repo: any, i: number) => {
        console.log(`    ${i + 1}. ${repo.fullName}`);
        console.log(`       ACS Score: ${repo.acsScore}/100 (${repo.recommendation})`);
        console.log(`       Strategy: ${repo.skillStrategy}`);
        console.log(`       URL: ${repo.url}`);
      });
    }
  } catch (error) {
    log('red', `✗ API call failed: ${(error as Error).message}`);
    console.error(error);
  }
}

async function testConsultantEndpoint() {
  log('bright', '\n=== Testing Consultant API Endpoint ===\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  const testCase = {
    message: 'Find me the best Python library for extracting tables from PDFs',
    history: [],
  };

  log('blue', `Sending request to ${baseUrl}/api/consultant`);
  log('yellow', `Message: ${testCase.message}\n`);

  try {
    const response = await fetch(`${baseUrl}/api/consultant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    log('green', `✓ Consultant call successful!`);
    log('bright', `  Response: ${result.message.slice(0, 200)}...`);
    log('bright', `  Duration: ${result.metadata.duration}ms`);

    if (result.toolCalls && result.toolCalls.length > 0) {
      log('bright', '\n  Tool Calls:');
      result.toolCalls.forEach((call: any) => {
        console.log(`    - ${call.tool}`);
        console.log(`      Success: ${call.result.success}`);
        if (call.result.repositories) {
          console.log(`      Found: ${call.result.repositories.length} repositories`);
        }
      });
    }
  } catch (error) {
    log('red', `✗ Consultant call failed: ${(error as Error).message}`);
    console.error(error);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--direct')) {
    await testDirectWorkflow();
  } else if (args.includes('--api')) {
    await testAPIEndpoint();
  } else if (args.includes('--consultant')) {
    await testConsultantEndpoint();
  } else {
    log('yellow', 'Usage:');
    log('bright', '  tsx scripts/test-h2-discovery.ts --direct       # Test workflow directly');
    log('bright', '  tsx scripts/test-h2-discovery.ts --api          # Test /api/search/h2-discovery');
    log('bright', '  tsx scripts/test-h2-discovery.ts --consultant   # Test /api/consultant');
    log('bright', '  tsx scripts/test-h2-discovery.ts                # Show this help\n');

    log('yellow', 'Note: For API tests, make sure the server is running:');
    log('bright', '  npm run dev\n');
  }
}

main().catch((error) => {
  log('red', `Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
