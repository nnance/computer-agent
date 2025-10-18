# Input Schema Specification

## Overview

Eliminate duplication between Zod schemas and JSON Schema definitions in `RunnableTool` definitions by leveraging Zod v4's native `z.toJSONSchema()` capability.

## Problem Statement

Currently, each `RunnableTool` maintains two schema definitions that must stay synchronized:

1. **Zod schema** (`input` property) - Used for runtime validation
2. **JSON Schema** (`tool.input_schema`) - Sent to Claude API

This creates:
- Code duplication (~50-100 lines across all tools)
- Maintenance burden
- Risk of schema mismatches
- Verbose tool definitions

### Example of Current Duplication

```typescript
// File: bashTool.ts
const BashInputSchema = z.object({
  command: z.string().describe("The bash shell command to execute"),
  restart: z.boolean().optional().describe("Set to true to restart the bash session"),
});

const bashTool: RunnableTool<BashToolInput, BashResult> = {
  tool: {
    type: toolVersion,
    name: "bash",
  },
  input: BashInputSchema,
  run: async (input) => { /* ... */ },
};

// The input_schema must be manually maintained and kept in sync with BashInputSchema
// Currently missing from bashTool definition but present in other tools
```

## Solution

Create a utility function that auto-generates JSON Schema from Zod schemas using `z.toJSONSchema()`.

### Implementation Details

#### 1. Create Utility Function

**File**: `src/tools/schemaUtils.ts` (new file)

```typescript
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Converts a Zod schema to JSON Schema format compatible with Claude API.
 * Uses Zod v4's built-in z.toJSONSchema() for accurate conversions.
 *
 * @param zodSchema - The Zod schema to convert
 * @returns JSON Schema object for use in tool definitions
 */
export function zodToJsonSchema(
  zodSchema: z.ZodTypeAny
): Record<string, any> {
  return z.toJSONSchema(zodSchema, {
    target: "draft-7", // Use Draft 7 for broad compatibility
  });
}

/**
 * Helper to extract required fields from a Zod object schema.
 * @param zodSchema - Object schema to analyze
 * @returns Array of required field names
 */
export function getRequiredFields(zodSchema: z.ZodObject<any>): string[] {
  const shape = zodSchema.shape;
  return Object.entries(shape)
    .filter(([_, schema]) => !((schema as any).isOptional?.() ?? false))
    .map(([key]) => key);
}
```

#### 2. Create RunnableTool Factory

**File**: `src/tools/types.ts` (updated)

Add new factory function to create RunnableTool with auto-generated schema:

```typescript
/**
 * Creates a RunnableTool with automatic JSON Schema generation.
 * This eliminates the need to manually maintain both Zod and JSON schemas.
 *
 * @param config - Configuration object containing tool definition and implementation
 * @returns RunnableTool with generated input_schema
 */
export function createRunnableTool<T, U>(config: {
  name: string;
  description: string;
  schema: z.ZodSchema<T>;
  run: (input: T) => Promise<U>;
  type?: string;
}): RunnableTool<T, U> {
  const inputSchema = zodToJsonSchema(config.schema);

  return {
    tool: {
      type: config.type || "auto",
      name: config.name,
      description: config.description,
      input_schema: inputSchema,
    },
    input: config.schema as z.Schema<T>,
    run: config.run,
  };
}
```

#### 3. Migration Strategy

Tools will be updated in phases:

**Phase 1: Utility Creation & Testing** (this spec)
- Create `schemaUtils.ts` with conversion functions
- Add unit tests for schema generation
- Document expected JSON Schema output format

**Phase 2: Tool Migrations** (separate task)
- Migrate each tool to use `createRunnableTool()`
- Verify generated schemas match original definitions
- Remove manual `input_schema` definitions
- Update corresponding tests

**Phase 3: Documentation**
- Update CLAUDE.md with new pattern
- Update tool creation examples
- Mark roadmap item complete

### Tools to Migrate

1. **bashTool.ts** - 1 tool
2. **appleNotesTool.ts** - 5 tools (searchNotes, createNote, editNote, listNotes, getNoteContent)
3. **appleCalendarTool.ts** - Multiple tools (listEvents, searchEvents, createEvent, etc.)
4. **appleContactsTool.ts** - Multiple tools
5. **grepTool.ts** - 1 tool
6. **textEditorTool.ts** - May have special format, requires analysis
7. **webFetchTool.ts** - May be PlainTool, not applicable

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Lines of schema code** | ~150 | ~50 |
| **Maintenance points** | 2 per tool | 1 per tool |
| **Risk of mismatch** | High | None |
| **Tool creation friction** | High | Low |
| **Type safety** | Full | Full |

### Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Schema generation edge cases | Comprehensive test suite, manual verification during migration |
| API incompatibility | Verify with dummy API calls during testing |
| Circular references in schemas | Use `z.toJSONSchema()` with `cycles: "ref"` option |
| Optional vs required fields | Test with complex schemas before full rollout |

### Testing

**Unit Tests** (`src/__tests__/schemaUtils.test.ts`):
- ✅ Convert simple object schemas
- ✅ Handle optional fields correctly
- ✅ Preserve field descriptions
- ✅ Generate correct `required` array
- ✅ Handle nested objects
- ✅ Handle enums and unions
- ✅ Generate Draft 7 JSON Schema format

**Integration Tests**:
- ✅ Verify generated schemas work with Claude API
- ✅ Compare generated schemas with original definitions
- ✅ Test that tool validation still works correctly

### Documentation Updates

**CLAUDE.md Changes**:
- Remove duplication warning from "Adding New Tools" section
- Add example using `createRunnableTool()`
- Document `schemaUtils` module
- Explain how descriptions are preserved

### Backward Compatibility

- ✅ Existing `RunnableTool` interface unchanged
- ✅ All tools continue to work during migration
- ✅ `PlainTool` types unaffected
- ✅ No breaking changes to public API

### Success Criteria

- [ ] `schemaUtils.ts` created with working conversion functions
- [ ] Unit tests pass (100% coverage for utils)
- [ ] At least one tool successfully migrated with verified schema
- [ ] Generated schemas validated against Claude API
- [ ] All tests pass
- [ ] CLAUDE.md updated with new pattern
- [ ] ROADMAP.md marked complete
- [ ] All tools migrated to use utility

### Related Issues

- Addresses: ROADMAP.md line 15 - "Use the JSON schema from ZOD schema for tool input schema to remove duplication"
- Related: CLAUDE.md "Adding New Tools" section needs update after implementation

### References

- Zod v4 JSON Schema: https://zod.dev/json-schema
- Current Zod version: 4.1.12 (package.json)
- JSON Schema Draft 7: https://json-schema.org/draft-07/
