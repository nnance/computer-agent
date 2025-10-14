# Web Search Tool Implementation Plan

**Date**: 2025-10-13
**Feature**: Web Search Tool Integration
**Status**: ✅ Completed

## Overview

Implement Claude's native web search tool (`web_search_20250305`) following the `textEditorTool` pattern. The tool is executed by Claude's API (not locally), but we need to handle the responses properly in the message loop.

## Requirements

Based on [Claude's Web Search Tool Documentation](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool):

- Tool type: `web_search_20250305`
- API-executed (no local run method needed)
- Configurable via environment variables
- Supports domain filtering and location context
- Pricing: $10 per 1,000 searches

## Implementation Steps

### 1. Update Type System ✅

**File**: `src/types.ts`

- Added `PlainTool` interface for API-executed tools
- Kept existing `RunnableTool<T, U>` for locally-executed tools
- Created `Tool` union type combining both
- Added `isRunnableTool()` type guard function

**Rationale**: Need to distinguish between tools that execute locally (AppleScript, bash, text editor) and tools executed by Claude's API (web search).

### 2. Create Web Search Tool ✅

**File**: `src/webSearchTool.ts`

- Exported `PlainTool` with web search configuration
- Loaded configuration from environment variables:
  - `WEB_SEARCH_MAX_USES` - Maximum searches per request
  - `WEB_SEARCH_ALLOWED_DOMAINS` - Comma-separated whitelist
  - `WEB_SEARCH_BLOCKED_DOMAINS` - Comma-separated blacklist
  - `WEB_SEARCH_USER_LOCATION_CITY`
  - `WEB_SEARCH_USER_LOCATION_REGION`
  - `WEB_SEARCH_USER_LOCATION_COUNTRY`
  - `WEB_SEARCH_USER_LOCATION_TIMEZONE`
- Parsed comma-separated domain lists
- Built user_location object conditionally

**Key Design Decision**: Tool is initialized at module load time as an IIFE to capture environment variables immediately.

### 3. Update Message Loop ✅

**File**: `src/index.ts`

Changes made:

1. **Imports**: Added `webSearchTool`, `Tool` type, and `isRunnableTool` type guard
2. **Tools Array**: Changed type to `Tool[]` and added `webSearchTool`
3. **System Prompt**: Updated to mention web search capability
4. **processToolCall()**: Modified to:
   - Return `Promise<Anthropic.ToolResultBlockParam | null>`
   - Check if tool is `RunnableTool` using type guard
   - Return `null` for `PlainTool` (API handles execution)
   - Execute locally for `RunnableTool`
5. **sendMessage()**: Updated to handle `null` returns from API-executed tools

**Flow**: API-executed tools like `web_search` are handled entirely by Claude's API. The API returns results as `BetaWebSearchToolResultBlock` content blocks automatically.

### 4. Environment Configuration ✅

**File**: `.env.example`

Documented all configuration options with examples:
- Required: `ANTHROPIC_API_KEY`
- Optional: All web search configuration variables
- Included usage notes and pricing information

### 5. Documentation ✅

**File**: `CLAUDE.md`

Updates:
- Explained `PlainTool` vs `RunnableTool` pattern
- Updated tool registration section
- Updated tool execution flow section
- Added dedicated Web Search Tool section with:
  - Tool structure
  - Configuration options
  - Important constraints
  - Pricing information
- Updated "Adding New Tools" section for both tool types

### 6. Unit Tests ✅

**File**: `src/__tests__/webSearchTool.test.ts`

Test coverage:
- Tool definition structure (type, name)
- PlainTool characteristics (no input/run methods)
- Configuration property validation
- Type validation for configured properties
- Domain filtering validation
- User location structure validation
- Constraint validation (no both allowed and blocked domains)
- Type guard functionality

**Note**: Tests validate the tool structure and configuration based on current environment rather than testing module reloading, as the tool is initialized at module load time.

## Technical Details

### Tool Type Structure

```typescript
interface PlainTool {
  tool: {
    type: "web_search_20250305";
    name: "web_search";
    max_uses?: number;
    allowed_domains?: string[];
    blocked_domains?: string[];
    user_location?: {
      type: "approximate";
      city?: string;
      region?: string;
      country?: string;
      timezone?: string;
    };
  };
}
```

### Response Handling

The API returns `BetaWebSearchToolResultBlock` content blocks containing:
- Search query used
- Search results with metadata (title, URL, encrypted content, page age)
- Automatic citations

No local processing of these blocks is needed - they flow through the message loop automatically.

### Constraints

- Cannot use both `allowed_domains` and `blocked_domains` simultaneously
- Domain filtering supports subdomains
- All configuration is optional
- Pricing: $10 per 1,000 searches plus standard token costs

## Testing

All tests pass:
- ✅ 16 total tests passing
- ✅ Tool definition tests
- ✅ Configuration validation tests
- ✅ Type guard tests
- ✅ Build succeeds with no TypeScript errors

## Files Modified

1. `src/types.ts` - Added PlainTool, Tool union, and type guard
2. `src/webSearchTool.ts` - New file with web search tool definition
3. `src/index.ts` - Updated message loop to handle both tool types
4. `src/__tests__/webSearchTool.test.ts` - New test file
5. `.env.example` - Added configuration documentation
6. `CLAUDE.md` - Updated with comprehensive documentation

## Lessons Learned

1. **Module Initialization**: Tools initialized at module load time (IIFE pattern) can't be easily tested with different environment variables without module cache clearing
2. **Type System Flexibility**: Union types allow supporting different tool execution patterns without breaking existing code
3. **API-Executed Tools**: Some tools require only configuration, no execution logic
4. **Test Strategy**: For module-level initialization, test current state validation rather than dynamic reconfiguration

## Future Enhancements

Potential improvements:
- Add validation to prevent both `allowed_domains` and `blocked_domains` being set
- Add domain format validation (basic DNS validation)
- Create helper functions for building location objects
- Add integration tests with actual API calls (may incur costs)
- Consider runtime reconfiguration support if needed
