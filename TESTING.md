# Testing Guide

This document describes the testing setup and guidelines for the oh-my-github project.

## Test Framework

We use **Vitest** as our testing framework:
- Fast, modern test runner with TypeScript support
- Compatible with Jest API
- Built-in code coverage
- Watch mode for development

## Installation

First, install the test dependencies:

```bash
npm install
```

## Running Tests

### Run all tests (watch mode)
```bash
npm test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Structure

Tests are located in `__tests__` directories next to the code they test:

```
lib/
├── agents/
│   └── coordinator/
│       ├── __tests__/
│       │   ├── conversation-manager.test.ts
│       │   ├── intent-classifier.test.ts
│       │   └── workflow.integration.test.ts
│       ├── conversation-manager.ts
│       ├── intent-classifier.ts
│       └── workflow.ts
├── api/
│   └── __tests__/
│       ├── validation.test.ts
│       └── rate-limit.test.ts
└── streaming/
    └── __tests__/
        └── sse-stream.test.ts
```

## Test Categories

### Unit Tests
Test individual functions and modules in isolation.

**Files:**
- `conversation-manager.test.ts` - Conversation CRUD operations
- `sse-stream.test.ts` - Server-Sent Events streaming
- `validation.test.ts` - Request validation
- `rate-limit.test.ts` - Rate limiting logic
- `intent-classifier.test.ts` - Intent classification (mocked LLM)

**Run unit tests only:**
```bash
npm test -- --run lib/agents lib/api lib/streaming
```

### Integration Tests
Test complete workflows end-to-end.

**Files:**
- `workflow.integration.test.ts` - Full coordinator workflow

**Run integration tests only:**
```bash
npm test -- --run **/*.integration.test.ts
```

## Writing Tests

### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`

### Example Unit Test
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../my-module';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Example Test with Mocks
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies
vi.mock('../external-module', () => ({
  externalFunction: vi.fn(() => 'mocked result'),
}));

import { myFunction } from '../my-module';

describe('myFunction with mocks', () => {
  it('should use mocked dependency', () => {
    const result = myFunction();
    expect(result).toBe('mocked result');
  });
});
```

### Example Test with Timers
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('time-based functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should timeout after 5 seconds', () => {
    const callback = vi.fn();
    setTimeout(callback, 5000);

    vi.advanceTimersByTime(5000);

    expect(callback).toHaveBeenCalled();
  });
});
```

## Test Coverage Goals

We aim for the following coverage targets:
- **Unit tests**: 90%+ coverage
- **Integration tests**: Cover all happy paths and critical error scenarios
- **Overall**: 80%+ coverage

Check current coverage:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Environment Variables for Tests

Tests use environment variables for configuration:
- `DEEPSEEK_API_KEY` - API key for LLM calls (can be test key for mocked tests)
- `GITHUB_TOKEN` - GitHub API token (can be test token for mocked tests)

For unit tests, these are automatically set to test values in `vitest.setup.ts`.

For integration tests that make real API calls, set actual values:
```bash
export DEEPSEEK_API_KEY=your-key
export GITHUB_TOKEN=your-token
npm test
```

## Continuous Integration

Tests should pass in CI environments:
```bash
npm run test:run
npm run type-check
npm run lint
```

## Debugging Tests

### Run specific test file
```bash
npm test -- conversation-manager.test.ts
```

### Run specific test case
```bash
npm test -- -t "should create a new conversation"
```

### Debug in VS Code
Add this to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Keep tests independent** - Each test should run in isolation
3. **Use descriptive test names** - Name should explain what is being tested
4. **Test edge cases** - Don't just test happy paths
5. **Mock external dependencies** - LLM calls, API calls, databases
6. **Clean up after tests** - Use `afterEach` to reset state
7. **Keep tests fast** - Unit tests should run in milliseconds

## Current Test Coverage

### Agent Coordinator
- ✅ Conversation Manager (20+ tests)
- ✅ SSE Stream (12+ tests)
- ✅ Validation (13+ tests)
- ✅ Rate Limiter (20+ tests)
- ✅ Intent Classifier (15+ tests)
- ✅ Integration workflow (6+ tests)

**Total:** ~86 tests covering the new Agent Coordinator system

## Troubleshooting

### Tests timing out
- Increase timeout in test: `it('test', () => {...}, 15000)`
- Check for unmocked async operations
- Verify fake timers are properly configured

### Mock not working
- Ensure mock is defined before imports: `vi.mock()` must come before `import`
- Use `vi.clearAllMocks()` in `beforeEach()`

### Type errors in tests
- Add types to mocked functions: `vi.mocked(myFunction)`
- Use `as any` sparingly for test doubles

## Contributing

When adding new features:
1. Write tests first (TDD) or alongside code
2. Ensure all tests pass: `npm run test:run`
3. Check coverage: `npm run test:coverage`
4. Update this guide if adding new test patterns
