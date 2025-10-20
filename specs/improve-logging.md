# Implementation Spec: Configurable Debug Logging System

## Objective

Remove hardcoded console logs and replace with a configurable logging system using OutputHandlers. All console.log and console.error statements will be replaced with an OutputHandler method that respects a debug flag setting.

## Design Approach

### Core Design Decisions
1. **Single debug flag**: `DEBUG=true` (environment variable) + `-d, --debug` (CLI flag)
2. **Debug output to stderr**: Keeps JSON mode clean and separates diagnostic output from actual output
3. **Replace ALL console.log/error**: Including help text, test output, and all tool diagnostics
4. **Debug separate from verbose**:
   - `verbose` flag = tool execution details and thinking indicators
   - `debug` flag = internal diagnostic messages (AppleScript errors, command output, recursion depth)
5. **Single debug method with optional level**: `showDebug(message: string, level?: 'info' | 'warn' | 'error')`

## Implementation Plan

### Phase 1: Core Infrastructure (3 files)

#### 1.1 Update `src/helpers/outputHandler.ts`

**Changes:**
- Add two new methods to `OutputHandler` interface:
  - `showDebug(message: string, level?: 'info' | 'warn' | 'error'): void` - for debug messages
  - `showHelp(helpText: string): void` - for help text output

- Update factory function `createOutputHandler()` to accept `debug: boolean` parameter:
  ```typescript
  function createOutputHandler(
    format: "json" | "text",
    verbose: boolean,
    debug: boolean,
    model: string,
  ): OutputHandler | JsonOutputHandler
  ```

- Implement `showDebug()` in each handler:
  - **Interactive/Non-interactive**: Write to `process.stderr` only if `debug === true`
    - Level 'info': gray text
    - Level 'warn': yellow text
    - Level 'error': red text
    - Use `process.stderr.write()` to write directly (not via @clack/prompts)
  - **JSON handler**: No-op (silent, doesn't output anything)

- Implement `showHelp()` in each handler:
  - Write help text to `stdout` using existing `log.message()` or `process.stdout.write()`
  - JSON handler: No-op (help not needed in JSON mode)

**Implementation pattern:**
```typescript
export interface OutputHandler {
  startThinking: () => void;
  stopThinking: (message: string) => void;
  startTool: (toolName: string) => void;
  stopTool: (toolName: string, success: boolean, message: string) => void;
  showMessage: (message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showDebug: (message: string, level?: 'info' | 'warn' | 'error') => void;
  showHelp: (helpText: string) => void;
}
```

#### 1.2 Update `src/helpers/parseArgs.ts`

**Changes:**
- Add `debug: boolean` field to `ParsedArgs` interface
- Add parsing for `-d` and `--debug` flags in `parseArgs()` function
- Update `showHelp()` function signature to accept `output: OutputHandler` parameter
- Replace `console.log()` call at line 66 with `output.showHelp(helpText)` call
- Build help text as a string and pass it to `output.showHelp()`
- Update help text to document the new `-d, --debug` flag

**Help text additions:**
```
Options:
  -d, --debug              Enable debug logging to stderr
```

#### 1.3 Update `src/index.ts`

**Changes:**
- Read `DEBUG` environment variable at startup (default: `false`)
  - Parse as boolean: `process.env.DEBUG === 'true'`
- Add to `ParsedArgs` interface usage to capture CLI `debug` flag
- CLI `-d, --debug` flag overrides/extends environment variable setting
- Pass `debug` flag to `createOutputHandler()` when creating handlers
- Replace `console.error()` at line 140 with `output.showError()`
- Update `showHelp()` call to pass `output` instance: `showHelp(output)`
- Pass `output` instance to `runInteractiveMode()` and `runNonInteractiveMode()` functions where needed for help text

**Order of precedence:** CLI flag > Environment variable

### Phase 2: Tool Updates (6 files)

Each tool file receives the `output` parameter through the tool runner or directly. Replace all `console.log()` and `console.error()` statements with `output.showDebug()` calls.

#### 2.1 `src/tools/bashTool.ts` (5 console statements)
**Lines to replace:** 57-62 (success/failure), 209 (error)

Replace patterns:
```typescript
// OLD: console.log("✓ Command succeeded");
// NEW: output.showDebug("✓ Command succeeded");

// OLD: console.error("Error: ", stderr);
// NEW: output.showDebug(`Error: ${stderr}`, 'error');
```

#### 2.2 `src/tools/grepTool.ts` (1 console statement)
**Line to replace:** 166 (command execution)

```typescript
// OLD: console.log(`Executing: ${command}`);
// NEW: output.showDebug(`Executing: ${command}`);
```

#### 2.3 `src/tools/textEditorTool.ts` (3 console statements)
**Lines to replace:** 39-41 (success/failure/error)

Replace with:
```typescript
// OLD: console.log("✓ Edit successful");
// NEW: output.showDebug("✓ Edit successful");

// OLD: console.error("Error:", error);
// NEW: output.showDebug(`Error: ${error}`, 'error');
```

#### 2.4 `src/tools/appleNotesTool.ts` (10 console statements)
**Lines to replace:** 20, 23, 144, 146, 148, 174, 176, 203, 205, 229, 231, 233, 258, 260

Replace AppleScript errors:
```typescript
// OLD: console.error("AppleScript error:", stderr);
// NEW: output.showDebug(`AppleScript error: ${stderr}`, 'error');

// OLD: console.log("✓ Note created");
// NEW: output.showDebug("✓ Note created");
```

#### 2.5 `src/tools/appleCalendarTool.ts` (13 console statements)
**Lines to replace:** 35, 38, 240, 242, 244, 277, 279, 281, 315, 317, 319, 360, 362, 388, 390, 411, 413, 415, 441, 443

Similar pattern to Notes tool - replace AppleScript errors and success indicators.

#### 2.6 `src/tools/appleContactsTool.ts` (8 console statements)
**Lines to replace:** 23, 26, 238, 240, 242, 282, 284, 308, 310, 312, 338, 340

Similar pattern to Notes and Calendar tools.

### Phase 3: Test Updates (1 file)

#### 3.1 `src/__tests__/grepTool.test.ts`

**Changes:**
- Create a mock `OutputHandler` for use in tests:
  ```typescript
  const mockOutput: OutputHandler = {
    startThinking: () => {},
    stopThinking: () => {},
    startTool: () => {},
    stopTool: () => {},
    showMessage: () => {},
    showSuccess: () => {},
    showError: () => {},
    showDebug: () => {}, // Silenced in tests
    showHelp: () => {},
  };
  ```
- Replace any `console.log()` or `console.warn()` test skip messages with `output.showDebug()`
- Inject mock output into test tool instances where needed

### Phase 4: Documentation (1 file)

#### 4.1 Update `.env.example`

**Add new section:**
```env
# Debug Logging Configuration (optional)

# Enable debug logging output to stderr
# This logs internal diagnostic messages like AppleScript errors and command execution details
# Default: false
# Can also be enabled via CLI flag: npm start -- --debug
# DEBUG=false
```

**Update help documentation:**
- Add description of `-d, --debug` flag
- Explain that debug output goes to stderr
- Note that debug flag is separate from `--verbose` flag

## Files Modified

### Core Infrastructure
1. `src/helpers/outputHandler.ts` - Add showDebug() and showHelp() methods
2. `src/helpers/parseArgs.ts` - Add debug flag parsing and showHelp() integration
3. `src/index.ts` - Read DEBUG env var, pass debug flag to handlers, update showHelp() calls

### Tools (Update all console.log/error to use output.showDebug)
4. `src/tools/bashTool.ts`
5. `src/tools/grepTool.ts`
6. `src/tools/textEditorTool.ts`
7. `src/tools/appleNotesTool.ts`
8. `src/tools/appleCalendarTool.ts`
9. `src/tools/appleContactsTool.ts`

### Tests
10. `src/__tests__/grepTool.test.ts`

### Documentation
11. `.env.example`

## Testing Strategy

### Manual Testing
1. **Interactive mode**: `npm start` - should see no debug output (default)
2. **Interactive mode with debug**: `DEBUG=true npm start` - should see debug output on stderr
3. **CLI flag**: `npm start -- -d` - should see debug output on stderr
4. **Non-interactive mode**: `npm start -- -m "test"` - no debug output
5. **Non-interactive with debug**: `npm start -- -m "test" --debug` - debug output on stderr
6. **JSON mode with debug**: `npm start -- -m "test" --format json --debug` - JSON only, no debug
7. **Help text**: `npm start -- --help` - help displays via OutputHandler

### Automated Testing
1. Run `npm test` - all existing tests should pass
2. Run `npm run build` - TypeScript should compile without errors
3. Run `npm run format` - Biome formatting should pass
4. Check for any remaining `console.log` or `console.error` statements (should be 0)

## Success Criteria

- ✅ Zero `console.log()` or `console.error()` statements in `src/` directory (except string references)
- ✅ All debug output controllable via `DEBUG=true` environment variable
- ✅ All debug output controllable via `-d, --debug` CLI flag
- ✅ Debug output written to `stderr` (doesn't pollute `stdout` or JSON output)
- ✅ Help text displayed via `OutputHandler.showHelp()`
- ✅ Tests use mock `OutputHandler` instead of console
- ✅ All tests pass (`npm test`)
- ✅ TypeScript compilation passes (`npm run build`)
- ✅ Biome formatting passes (`npm run format`)
- ✅ Documentation updated in `.env.example`
- ✅ ROADMAP.md item marked as complete

## Implementation Notes

### Debug Output to Stderr
When `debug` is enabled, use:
```typescript
process.stderr.write(`[DEBUG] ${message}\n`);
```

This ensures debug output doesn't interfere with JSON output on stdout or normal tool output.

### Interactive vs Non-Interactive Behavior
Both handlers should behave the same way for debug output - write to stderr when enabled. The difference is in how they handle thinking/tool spinners, not debug output.

### Backward Compatibility
- Default behavior unchanged (debug disabled by default)
- Existing scripts unaffected
- `--verbose` flag unchanged and separate from `--debug`

### Type Safety
- All tools must receive `output: OutputHandler` parameter
- Use dependency injection pattern for testing
- Ensure TypeScript strict mode validation passes

### Migration Path
1. Update core infrastructure first
2. Update tools one by one (can be done incrementally)
3. Verify tests pass after each tool update
4. Run full test suite and build verification at the end
