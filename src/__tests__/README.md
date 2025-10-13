# Test Directory

This directory contains unit and integration tests for the computer-agent project using Vitest.

## Test Organization

```
src/__tests__/
├── README.md           # This file
└── example.test.ts     # Example test patterns
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = processInput(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Testing Async Functions

Always use `async/await` for promises:

```typescript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBe("expected");

  // Or test promise resolution/rejection
  await expect(asyncFunction()).resolves.toBe("expected");
  await expect(failingFunction()).rejects.toThrow("error message");
});
```

### Testing RunnableTool Instances

When testing tools, focus on:
1. Input validation (Zod schema)
2. Tool execution (run method)
3. Output format

```typescript
import { z } from "zod";
import { myTool } from "../myTool.js";

describe("MyTool", () => {
  it("should have correct tool definition", () => {
    expect(myTool.tool.name).toBe("my_tool");
    expect(myTool.tool.description).toBeDefined();
  });

  it("should validate input correctly", () => {
    const validInput = { param: "value" };
    const result = myTool.input.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should run successfully with valid input", async () => {
    const input = { param: "test" };
    const result = await myTool.run(input);
    expect(result).toBeDefined();
  });
});
```

### Mocking AppleScript Execution

For tools that use AppleScript, mock the execution:

```typescript
import { vi } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

it("should execute AppleScript", async () => {
  const mockExec = vi.mocked(exec);
  mockExec.mockImplementation((cmd, callback) => {
    callback(null, { stdout: "result", stderr: "" });
  });

  // Test your tool that uses AppleScript
});
```

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Interactive UI
npm run test:ui

# With coverage
npm run test:coverage
```

## Test Patterns

### Arrange-Act-Assert (AAA)

Organize tests into three clear sections:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the code being tested
- **Assert**: Verify the results

### Test Naming

Use descriptive test names that explain the scenario:
- ✅ "should return error when input is invalid"
- ✅ "should create note with correct title and body"
- ❌ "test 1"
- ❌ "works"

### Test Coverage Guidelines

Aim to test:
1. Happy path (expected successful usage)
2. Error cases (invalid inputs, failures)
3. Edge cases (empty strings, null values, boundary conditions)
4. Integration points (tool interactions, AppleScript calls)

## Best Practices

1. **Keep tests isolated**: Each test should be independent
2. **Use descriptive names**: Test names should explain what is being tested
3. **Test behavior, not implementation**: Focus on what the code does, not how
4. **Mock external dependencies**: Use mocks for file system, API calls, AppleScript
5. **Keep tests fast**: Avoid unnecessary delays or heavy operations
6. **Use TypeScript**: All test files should be `.test.ts` with proper types

## Common Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality for objects

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(number).toBeGreaterThan(5);
expect(number).toBeLessThanOrEqual(10);

// Strings
expect(string).toContain("substring");
expect(string).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty("key");
expect(object).toMatchObject({ key: "value" });

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Best Practices](https://vitest.dev/guide/best-practices)
