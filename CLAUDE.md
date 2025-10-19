# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Computer Agent is a TypeScript CLI tool that integrates Claude Sonnet 4 with macOS applications (Apple Notes, Calendar, Contacts) and file operations. It enables conversational interaction with local files and macOS system apps through natural language.

**Maintainer**: Nick Nance (nance.nick@gmail.com)

## Coding Standards

- Use Functional Programming principles
- Write modular, reusable functions
- Use async/await for asynchronous code
- Use dependency injection where appropriate
- Write unit tests for all functions (Vitest)
- Use TypeScript with strict types (no implicit `any`)
- Follow Biome formatting and linting rules (`npm run format`)
- Use Zod for runtime schema validation
- Use ES modules (`import`/`export`) with `.js` extensions in imports

## Essential Commands

```bash
npm install              # Install dependencies
npm run build           # Compile TypeScript to dist/
npm start               # Build and run in interactive mode (automatically runs build via prestart)
npm run format          # Run Biome linter and formatter
npm test                # Run tests with Vitest
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Run tests with interactive UI
npm run test:coverage   # Run tests with coverage report
```

**Important**: The project uses ES modules (`"type": "module"`). All imports must include `.js` extensions, even though source files are `.ts`.

## CLI Usage Modes

The agent supports two modes of operation:

### Interactive Mode (Default)

Start a conversational session where you can have multiple back-and-forth exchanges:

```bash
npm start
```

The agent will prompt you with "How can I help you?" and wait for your input. You can continue the conversation across multiple turns until you cancel (Ctrl+C).

### Non-Interactive Mode

Send a single message and receive a response without entering interactive mode:

```bash
# Using -m flag
npm start -- -m "What's on my calendar today?"

# Using --message flag
npm start -- --message "Add a note titled 'Meeting' with content 'Discuss project'"
```

In non-interactive mode:
- The agent processes your message and returns the complete response
- Tool calls are executed automatically as part of the agentic loop
- Output is plain text (no interactive spinners)
- The program exits after the response is complete

### Help

Display usage information:

```bash
npm start -- --help
npm start -- -h
```

## Architecture Overview

### Tool System: RunnableTool vs PlainTool

The project supports two types of tools defined in [types.ts](src/types.ts):

#### RunnableTool (Local Execution)
Tools with local execution logic (AppleScript, bash, text editor):

```typescript
interface RunnableTool<T, U> {
  tool: Anthropic.Tool | Anthropic.Messages.ToolUnion;
  input: z.Schema<T>;        // Zod schema for validation
  run: (input: T) => Promise<U>;
}
```

**Schema Generation**: Use the `createRunnableTool()` factory function to automatically generate JSON Schema from Zod schemas, eliminating manual duplication. The factory uses Zod's built-in `toJSONSchema()` to convert your Zod schema to the JSON Schema format required by Claude's API.

#### PlainTool (API-Executed)
Tools executed by Claude's API (web search):

```typescript
interface PlainTool {
  tool: Anthropic.Tool | Anthropic.Messages.ToolUnion;
}
```

These tools have no `input` or `run` methods because the API executes them and returns results automatically. The tool definition is only used to inform Claude of available capabilities.

### Agentic Message Loop

The core architecture in [index.ts](src/index.ts:90-135) implements a recursive message loop:

1. User sends message → Claude API
2. Claude returns response with optional tool calls
3. For each tool use: validate input → execute → collect results
4. If `stop_reason === "tool_use"`, recursively call `sendMessage()` with results
5. Return all messages to maintain conversation history

This enables multi-step autonomous task execution without user intervention.

### Tool Registration

Tools are registered in [index.ts](src/index.ts:13-20):

```typescript
const tools: Tool[] = [
  ...appleNotesTools,
  ...appleCalendarTools,
  ...appleContactsTools,
  textEditorTool,
  bashTool,
  webSearchTool,
];
```

The tools array contains both `RunnableTool` (local execution) and `PlainTool` (API-executed) instances. The type guard `isRunnableTool()` is used to distinguish between them at runtime.

### Context System

System prompt is loaded from a configurable context file via `loadContext()` ([index.ts](src/index.ts:24-40)). This file provides persistent context about user preferences and reference information.

**Configuration**:
- Environment variable: `CONTEXT_FILE_PATH`
- Default path: `./.agent/ASSISTANT.md`

The context file path can be customized in `.env`:
```bash
CONTEXT_FILE_PATH=./custom/path/context.md
```

### Tool Execution Flow

Tool calls are processed in `processToolCall()` ([index.ts](src/index.ts:64-105)):

1. Match tool by name
2. Check if tool is `RunnableTool` using `isRunnableTool()` type guard
3. **For PlainTool (API-executed)**: Return `null` (API handles execution)
4. **For RunnableTool (local execution)**:
   - Parse input using Zod schema (throws if invalid)
   - Execute tool's `run()` method
   - Return `ToolResultBlockParam` with content/error
   - Results serialized as JSON strings

API-executed tools like `web_search` are handled entirely by Claude's API. The API returns results as `BetaWebSearchToolResultBlock` content blocks automatically.

## AppleScript Integration Pattern

All Apple app integrations use AppleScript via `child_process.exec`:

```typescript
async executeAppleScript(script: string) {
  const { stdout, stderr } = await this.execAsync(`osascript -e '${script}'`);
  return stdout.trim();
}
```

**Important considerations**:
- String escaping: Single quotes and special characters must be escaped
- Permissions: App requires macOS Automation permissions for Calendar/Notes/Contacts
- Error handling: Always wrap in try-catch
- Data format: Return delimited strings (e.g., `|||` for fields, `:::` for records) for parsing

### Text Editor Tool

The [textEditorTool.ts](src/textEditorTool.ts) uses a different tool type format:

```typescript
tool: {
  type: "text_editor_20250728",  // Special tool version identifier
  name: "str_replace_based_edit_tool",
  max_characters: 10000,
}
```

This tool maintains an in-memory edit history (`editHistory` Map) for undo capability on `str_replace` and `insert` operations.

### Web Search Tool

The [webSearchTool.ts](src/webSearchTool.ts) is a `PlainTool` that enables Claude to search the web:

```typescript
tool: {
  type: "web_search_20250305",
  name: "web_search",
  max_uses?: number,
  allowed_domains?: string[],
  blocked_domains?: string[],
  user_location?: { ... },
}
```

**Key characteristics**:
- **API-executed**: Claude's API performs searches; no local execution code needed
- **No RunnableTool wrapper**: Just exports the plain tool definition
- **Configurable via environment variables**: See `.env.example` for all options
- **Automatic citations**: Search results include source citations
- **Pricing**: $10 per 1,000 searches (plus standard token costs)

**Configuration options** (all optional):
- `WEB_SEARCH_MAX_USES`: Limit searches per request
- `WEB_SEARCH_ALLOWED_DOMAINS`: Comma-separated domain whitelist
- `WEB_SEARCH_BLOCKED_DOMAINS`: Comma-separated domain blacklist
- `WEB_SEARCH_USER_LOCATION_*`: City, region, country, timezone for localized results

**Important**: Cannot use both `allowed_domains` and `blocked_domains` simultaneously.

## Adding New Tools

### For Locally-Executed Tools (RunnableTool)

1. Create a new file following the pattern: `[feature]Tool.ts`
2. Define Zod input schema with descriptions using `.describe()`
3. Use `createRunnableTool()` factory to create the tool with auto-generated JSON Schema
4. Export the tool
5. Import and add to `tools` array in [index.ts](src/index.ts:13-20)

**Example** (recommended pattern using `createRunnableTool`):
```typescript
import { z } from "zod";
import { createRunnableTool } from "./types.js";

const MyInputSchema = z.object({
  name: z.string().describe("The user's name"),
  age: z.number().optional().describe("The user's age in years"),
  active: z.boolean().default(true).describe("Whether the user is active"),
});

type MyToolInput = z.infer<typeof MyInputSchema>;

export const myTool = createRunnableTool({
  name: "my_tool",
  description: "Does something useful with user data",
  schema: MyInputSchema,
  run: async (input: MyToolInput) => {
    return `Hello, ${input.name}!`;
  },
});
```

**Key benefits**:
- No manual JSON Schema duplication
- Type-safe input validation
- Descriptions from `.describe()` are automatically included in JSON Schema
- Optional fields use `.optional()`
- Default values use `.default(value)`

**Legacy pattern** (manual schema definition):
```typescript
import { z } from "zod";
import type { RunnableTool } from "./types.js";

const MyInputSchema = z.object({
  param: z.string().describe("Parameter description"),
});

export const myTool: RunnableTool<z.infer<typeof MyInputSchema>, string> = {
  tool: {
    name: "my_tool",
    description: "Tool description",
    input_schema: {
      type: "object",
      properties: {
        param: {
          type: "string",
          description: "Parameter description"
        },
      },
      required: ["param"],
    },
  },
  input: MyInputSchema,
  run: async (input) => {
    return "result";
  },
};
```

**Note**: The legacy pattern with manual `input_schema` is still supported but not recommended. Use `createRunnableTool()` for new tools to eliminate duplication and reduce maintenance burden.

### For API-Executed Tools (PlainTool)

1. Create a new file following the pattern: `[feature]Tool.ts`
2. Export a `PlainTool` with only the tool definition
3. Load any configuration from environment variables
4. Import and add to `tools` array in [index.ts](src/index.ts:13-20)

See [webSearchTool.ts](src/tools/webSearchTool.ts) for a complete PlainTool example.

## Key Technical Details

### Dependencies
- `@anthropic-ai/sdk`: Claude API client
- `zod`: Runtime schema validation with JSON Schema generation
- `@clack/prompts`: Interactive CLI prompts
- `dotenv`: Environment variable management

### Schema Utilities

The project includes utilities in [schemaUtils.ts](src/tools/schemaUtils.ts) for working with Zod and JSON Schema:

- **`zodToJsonSchema(zodSchema)`**: Converts a Zod schema to JSON Schema Draft 7 format compatible with Claude's API. Uses Zod's built-in `toJSONSchema()` method.
- **`getRequiredFields(zodSchema)`**: Extracts required field names from a Zod object schema.

These utilities are used internally by `createRunnableTool()` to automatically generate the `input_schema` from your Zod schema definitions.

### Environment
- Requires `ANTHROPIC_API_KEY` in `.env`
- Requires `APPLE_CALENDAR_NAME` in `.env` (default calendar for calendar operations)
- Optional `ANTHROPIC_MODEL` in `.env` (default: `claude-sonnet-4-5`)
- Optional `ANTHROPIC_MAX_TOKENS` in `.env` (default: `1024`)
- macOS-only (AppleScript dependencies)
- Node.js with ES modules support

### Testing
- **Framework**: Vitest 3.x with TypeScript support
- **Test location**: Place tests in `src/__tests__/` directory with `.test.ts` or `.spec.ts` extensions
- **Configuration**: [vitest.config.ts](vitest.config.ts) configures test environment, coverage, and globals
- **Commands**:
  - `npm test`: Run all tests once
  - `npm run test:watch`: Run tests in watch mode (re-runs on file changes)
  - `npm run test:ui`: Open interactive UI for test exploration
  - `npm run test:coverage`: Generate coverage reports (text, JSON, HTML)
- **Coverage**: V8 provider with exclusions for `node_modules/`, `dist/`, config files, and type definitions
- **Test timeout**: 10 seconds per test (configurable in vitest.config.ts)
- **Globals**: `describe`, `it`, `expect` are available globally (no imports needed)

### Current Limitations
- Synchronous AppleScript execution (no parallelization)
- No streaming response support

### Code Style
- Use Biome for formatting (`npm run format`)
- Explicit TypeScript types required (no implicit `any`)
- camelCase for variables/functions, PascalCase for types/interfaces
- ES modules: always include `.js` extensions in imports

## Debugging Tips

**Tool not executing:**
1. Verify tool is in `tools` array ([index.ts](src/index.ts:9-14))
2. Check Zod schema matches `input_schema` exactly
3. Ensure tool name matches between definition and API response
4. Check console logs from tool's `run()` method

**AppleScript failures:**
1. Verify macOS permissions granted (System Settings → Privacy & Security → Automation)
2. Test script directly: `osascript -e 'tell application "Notes" to get name of notes'`
3. Check string escaping in AppleScript commands

**Type errors:**
1. Run `npm run build` to see full TypeScript errors
2. Remember to use `.js` extensions in imports
3. Ensure Zod schemas use `z.infer<>` for type inference

**Test failures:**
1. Run `npm test` to see detailed test output and error messages
2. Use `npm run test:watch` for rapid iteration on failing tests
3. Check test file imports include `.js` extensions (ES modules requirement)
4. Verify async tests use `async/await` properly
5. Use `npm run test:ui` for interactive debugging and test exploration

## Security Considerations

This is a defensive productivity tool. Do not add features for:
- Credential harvesting or discovery
- Bulk data extraction of sensitive information
- Unauthorized system access
- Any malicious capabilities

## Additional Resources

- [Anthropic Claude SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Zod Documentation](https://zod.dev/)
- [AppleScript Language Guide](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

Focus on legitimate personal productivity and automation use cases.
