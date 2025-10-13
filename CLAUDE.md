# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Computer Agent is a TypeScript CLI tool that integrates Claude Sonnet 4 with macOS applications (Apple Notes, Calendar, Contacts) and file operations. It enables conversational interaction with local files and macOS system apps through natural language.

**Maintainer**: Nick Nance (nance.nick@gmail.com)

## Essential Commands

```bash
npm install              # Install dependencies
npm run build           # Compile TypeScript to dist/
npm start               # Build and run (automatically runs build via prestart)
npm run format          # Run Biome linter and formatter
```

**Important**: The project uses ES modules (`"type": "module"`). All imports must include `.js` extensions, even though source files are `.ts`.

## Architecture Overview

### RunnableTool Pattern

All tools follow the `RunnableTool<T, U>` interface defined in [types.ts](src/types.ts):

```typescript
interface RunnableTool<T, U> {
  tool: Anthropic.Tool | Anthropic.Messages.ToolUnion;
  input: z.Schema<T>;        // Zod schema for validation
  run: (input: T) => Promise<U>;
}
```

**Critical**: The `input_schema` in the tool definition must exactly match the Zod schema structure. This duplication is required because:
1. Claude API needs JSON Schema format (`input_schema`)
2. Runtime validation uses Zod (`input` schema)

### Agentic Message Loop

The core architecture in [index.ts](src/index.ts:90-135) implements a recursive message loop:

1. User sends message → Claude API
2. Claude returns response with optional tool calls
3. For each tool use: validate input → execute → collect results
4. If `stop_reason === "tool_use"`, recursively call `sendMessage()` with results
5. Return all messages to maintain conversation history

This enables multi-step autonomous task execution without user intervention.

### Tool Registration

Tools are registered in [index.ts](src/index.ts:9-14):

```typescript
const tools = [
  ...appleNotesTools,
  ...appleCalendarTools,
  ...appleContactsTools,
  textEditorTool,
];
```

Each tool array contains one or more `RunnableTool` instances exported from their respective modules.

### Context System

System prompt is loaded from `./tmp/ASSISTANT.md` via `loadContext()` ([index.ts](src/index.ts:19-33)). This file provides persistent context about user preferences and reference information. The context file path is hardcoded.

### Tool Execution Flow

Tool calls are processed in `processToolCall()` ([index.ts](src/index.ts:56-88)):

1. Match tool by name
2. Parse input using Zod schema (throws if invalid)
3. Execute tool's `run()` method
4. Return `ToolResultBlockParam` with content/error
5. All results serialized as JSON strings

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

## Adding New Tools

1. Create a new file following the pattern: `[feature]Tool.ts`
2. Define Zod input schema
3. Create `RunnableTool` instance(s) with matching `input_schema` and Zod schema
4. Export tool array (e.g., `export const myTools = [tool1, tool2]`)
5. Import and spread into `tools` array in [index.ts](src/index.ts:9-14)

Example:
```typescript
import { z } from "zod";
import type { RunnableTool } from "./types.js";

const MyInputSchema = z.object({
  param: z.string(),
});

export const myTool: RunnableTool<z.infer<typeof MyInputSchema>, string> = {
  tool: {
    name: "my_tool",
    description: "Tool description",
    input_schema: {
      type: "object",
      properties: {
        param: { type: "string" },
      },
      required: ["param"],
    },
  },
  input: MyInputSchema,
  run: async (input) => {
    return "result";
  },
};

export const myTools = [myTool];
```

## Key Technical Details

### Dependencies
- `@anthropic-ai/sdk`: Claude API client
- `zod`: Runtime schema validation
- `@clack/prompts`: Interactive CLI prompts
- `dotenv`: Environment variable management

### Environment
- Requires `ANTHROPIC_API_KEY` in `.env`
- macOS-only (AppleScript dependencies)
- Node.js with ES modules support

### Current Limitations
- Max tokens: 1024 (hardcoded in [index.ts](src/index.ts:102))
- No test framework configured
- Synchronous AppleScript execution (no parallelization)
- No streaming response support
- Context file path is hardcoded to `./tmp/ASSISTANT.md`
- Default calendar hardcoded to `"nance.nick@gmail.com"` in calendar tools

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

## Security Considerations

This is a defensive productivity tool. Do not add features for:
- Credential harvesting or discovery
- Bulk data extraction of sensitive information
- Unauthorized system access
- Any malicious capabilities

Focus on legitimate personal productivity and automation use cases.
