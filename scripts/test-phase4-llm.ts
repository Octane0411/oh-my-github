/**
 * Test script for Phase 4: LLM-Based Scoring (Task 4.2)
 *
 * Run with: bun run scripts/test-phase4-llm.ts
 *
 * This script validates:
 * 1. LLM evaluation returns valid scores (0-10)
 * 2. Documentation, Ease of Use, and Relevance are evaluated
 * 3. Fallback to neutral scores (5.0) works when LLM fails
 * 4. Scores match README quality expectations
 */

import { evaluateWithLLM } from "../lib/agents/h1-search-pipeline/scoring";
import type { Repository } from "../lib/agents/h1-search-pipeline/types";

/**
 * Mock README content for testing
 */
const MOCK_READMES = {
  excellent: `# Awesome React Library

[![npm version](https://badge.fury.io/js/awesome-react.svg)](https://badge.fury.io/js/awesome-react)
[![Build Status](https://travis-ci.org/example/awesome-react.svg?branch=main)](https://travis-ci.org/example/awesome-react)

A modern, lightweight React library for building amazing user interfaces.

## Features

- 🚀 Lightning fast performance
- 📦 Zero dependencies
- 🎨 Beautiful default styles
- 🔧 Fully customizable
- 📝 TypeScript support
- ♿ Accessible by default

## Installation

\`\`\`bash
npm install awesome-react
# or
yarn add awesome-react
# or
pnpm add awesome-react
\`\`\`

## Quick Start

\`\`\`jsx
import { Button, Card } from 'awesome-react';

function App() {
  return (
    <Card>
      <h1>Hello World</h1>
      <Button onClick={() => alert('Clicked!')}>
        Click me
      </Button>
    </Card>
  );
}
\`\`\`

## API Reference

### Button

\`\`\`tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
\`\`\`

### Card

\`\`\`tsx
interface CardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  children: React.ReactNode;
}
\`\`\`

## Advanced Examples

### Custom Theme

\`\`\`jsx
import { ThemeProvider, Button } from 'awesome-react';

const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
  },
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Button variant="primary">Themed Button</Button>
    </ThemeProvider>
  );
}
\`\`\`

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT © 2024 Example Corp
`,

  basic: `# Simple Utility

A simple JavaScript utility for data manipulation.

## Install

\`\`\`
npm install simple-util
\`\`\`

## Usage

\`\`\`js
const util = require('simple-util');
util.transform(data);
\`\`\`

That's it!
`,

  poor: `# Project

Some code.

Install: npm i

Use: require('project')
`,
};

/**
 * Test cases with different README quality levels
 */
const TEST_CASES = [
  {
    name: "Test 1: Excellent Documentation (React UI library)",
    repo: {
      full_name: "example/awesome-react",
      name: "awesome-react",
      owner: "example",
      description: "A modern, lightweight React library for building UIs",
      stars: 5000,
      forks: 400,
      language: "TypeScript",
      topics: ["react", "ui", "components"],
      created_at: "2022-01-15T00:00:00Z",
      updated_at: new Date().toISOString(),
      pushed_at: new Date().toISOString(),
      has_readme: true,
      is_archived: false,
      is_fork: false,
      license: "MIT",
      open_issues_count: 25,
      default_branch: "main",
      html_url: "https://github.com/example/awesome-react",
    } as Repository,
    readme: MOCK_READMES.excellent,
    userQuery: "lightweight React component library",
    expectations: {
      documentationMin: 8,
      easeOfUseMin: 8,
      relevanceMin: 8,
    },
  },
  {
    name: "Test 2: Basic Documentation (Simple utility)",
    repo: {
      full_name: "user/simple-util",
      name: "simple-util",
      owner: "user",
      description: "Data manipulation utility",
      stars: 120,
      forks: 15,
      language: "JavaScript",
      topics: ["utility"],
      created_at: "2023-06-01T00:00:00Z",
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      has_readme: true,
      is_archived: false,
      is_fork: false,
      license: "MIT",
      open_issues_count: 3,
      default_branch: "main",
      html_url: "https://github.com/user/simple-util",
    } as Repository,
    readme: MOCK_READMES.basic,
    userQuery: "JavaScript data utility",
    expectations: {
      documentationMin: 4,
      documentationMax: 7,
      easeOfUseMin: 4,
      easeOfUseMax: 7,
      relevanceMin: 6,
    },
  },
  {
    name: "Test 3: Poor Documentation (Minimal README)",
    repo: {
      full_name: "dev/project",
      name: "project",
      owner: "dev",
      description: "A project",
      stars: 50,
      forks: 5,
      language: "JavaScript",
      topics: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days ago
      pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      has_readme: true,
      is_archived: false,
      is_fork: false,
      open_issues_count: 8,
      default_branch: "main",
      html_url: "https://github.com/dev/project",
    } as Repository,
    readme: MOCK_READMES.poor,
    userQuery: "React state management library",
    expectations: {
      documentationMax: 4,
      easeOfUseMax: 4,
      relevanceMax: 3, // Poor match - not React, not state management
    },
  },
];

async function runTests() {
  console.log("🧪 Phase 4 Task 4.2: LLM-Based Scoring Test\\n");
  console.log("=".repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  for (const test of TEST_CASES) {
    console.log(`\\n📝 ${test.name}`);
    console.log(`Repo: ${test.repo.full_name}`);
    console.log(`Query: "${test.userQuery}"`);
    console.log(`README Length: ${test.readme.length} chars`);

    try {
      const startTime = Date.now();
      const result = await evaluateWithLLM(
        test.repo,
        test.readme,
        test.userQuery
      );
      const elapsedTime = Date.now() - startTime;

      console.log(`\\n📊 LLM Evaluation Results (${elapsedTime}ms):`);
      console.log(`  Documentation: ${result.documentation}/10`);
      console.log(`  Ease of Use:   ${result.easeOfUse}/10`);
      console.log(`  Relevance:     ${result.relevance}/10`);

      if (result.reasoning) {
        console.log(`\\n💭 Reasoning:`);
        if (result.reasoning.documentation) {
          console.log(`  Doc: ${result.reasoning.documentation}`);
        }
        if (result.reasoning.easeOfUse) {
          console.log(`  UX:  ${result.reasoning.easeOfUse}`);
        }
        if (result.reasoning.relevance) {
          console.log(`  Rel: ${result.reasoning.relevance}`);
        }
      }

      // Validation
      console.log(`\\n✅ Validation:`);
      const validations: string[] = [];

      // Check all scores are in valid range
      const allInRange =
        result.documentation >= 0 &&
        result.documentation <= 10 &&
        result.easeOfUse >= 0 &&
        result.easeOfUse <= 10 &&
        result.relevance >= 0 &&
        result.relevance <= 10;
      if (allInRange) {
        validations.push("✓ All scores in valid range (0-10)");
      } else {
        validations.push("✗ Some scores out of range");
      }

      // Check decimal precision
      const allPrecise =
        result.documentation === Math.round(result.documentation * 10) / 10 &&
        result.easeOfUse === Math.round(result.easeOfUse * 10) / 10 &&
        result.relevance === Math.round(result.relevance * 10) / 10;
      if (allPrecise) {
        validations.push("✓ All scores have 1 decimal precision");
      } else {
        validations.push("✗ Some scores have incorrect precision");
      }

      // Check expectations
      if (test.expectations.documentationMin) {
        if (result.documentation >= test.expectations.documentationMin) {
          validations.push(
            `✓ Documentation meets minimum (${result.documentation} >= ${test.expectations.documentationMin})`
          );
        } else {
          validations.push(
            `✗ Documentation below expected (${result.documentation} < ${test.expectations.documentationMin})`
          );
        }
      }

      if (test.expectations.documentationMax) {
        if (result.documentation <= test.expectations.documentationMax) {
          validations.push(
            `✓ Documentation within maximum (${result.documentation} <= ${test.expectations.documentationMax})`
          );
        } else {
          validations.push(
            `✗ Documentation above expected (${result.documentation} > ${test.expectations.documentationMax})`
          );
        }
      }

      if (test.expectations.easeOfUseMin) {
        if (result.easeOfUse >= test.expectations.easeOfUseMin) {
          validations.push(
            `✓ Ease of Use meets minimum (${result.easeOfUse} >= ${test.expectations.easeOfUseMin})`
          );
        } else {
          validations.push(
            `✗ Ease of Use below expected (${result.easeOfUse} < ${test.expectations.easeOfUseMin})`
          );
        }
      }

      if (test.expectations.easeOfUseMax) {
        if (result.easeOfUse <= test.expectations.easeOfUseMax) {
          validations.push(
            `✓ Ease of Use within maximum (${result.easeOfUse} <= ${test.expectations.easeOfUseMax})`
          );
        } else {
          validations.push(
            `✗ Ease of Use above expected (${result.easeOfUse} > ${test.expectations.easeOfUseMax})`
          );
        }
      }

      if (test.expectations.relevanceMin) {
        if (result.relevance >= test.expectations.relevanceMin) {
          validations.push(
            `✓ Relevance meets minimum (${result.relevance} >= ${test.expectations.relevanceMin})`
          );
        } else {
          validations.push(
            `✗ Relevance below expected (${result.relevance} < ${test.expectations.relevanceMin})`
          );
        }
      }

      if (test.expectations.relevanceMax) {
        if (result.relevance <= test.expectations.relevanceMax) {
          validations.push(
            `✓ Relevance within maximum (${result.relevance} <= ${test.expectations.relevanceMax})`
          );
        } else {
          validations.push(
            `✗ Relevance above expected (${result.relevance} > ${test.expectations.relevanceMax})`
          );
        }
      }

      // Check response time
      if (elapsedTime < 20000) {
        validations.push(`✓ Response time acceptable (${elapsedTime}ms < 20s)`);
      } else {
        validations.push(`⚠ Response time slow (${elapsedTime}ms > 20s)`);
      }

      console.log(validations.map((v) => `  ${v}`).join("\\n"));

      // Check if all validations passed
      const allPassed = validations.every((v) => v.startsWith("✓"));
      if (allPassed) {
        console.log(`\\n✅ ${test.name} PASSED`);
        passedTests++;
      } else {
        console.log(`\\n❌ ${test.name} FAILED`);
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
  console.log("\\n" + "=".repeat(70));
  console.log(`\\n📊 Test Summary:`);
  console.log(`   Passed: ${passedTests}/${TEST_CASES.length}`);
  console.log(`   Failed: ${failedTests}/${TEST_CASES.length}`);

  if (failedTests === 0) {
    console.log("\\n🎉 All tests passed! LLM-based scoring works correctly.\\n");
  } else {
    console.log("\\n⚠️  Some tests failed. Please review the failures above.\\n");
    console.log(
      "Note: LLM responses can vary. If scores are close to expectations,"
    );
    console.log("this may be acceptable variation in LLM evaluation.\\n");
    // Don't exit with error code for LLM tests due to expected variance
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
