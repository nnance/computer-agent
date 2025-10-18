# Grep Tool - Example Prompts

This guide provides example prompts for triggering the Grep tool in Computer Agent. The Grep tool is built on ripgrep and provides fast, powerful content search across your codebase.

## Quick Overview

**When to use Grep:**
- Searching for specific text, functions, variables, or patterns
- Finding exact matches or regex patterns across files
- Locating where specific APIs, libraries, or modules are used
- "Needle in haystack" searches for known strings

**When NOT to use Grep (use Task/Explore agent instead):**
- Exploratory questions about architecture ("How does error handling work?")
- Understanding codebase structure ("What's the project organization?")
- Gathering broad context ("How are tools registered?")
- Open-ended investigation that may require multiple search rounds

## Example Prompts by Category

### 1. Exact Content Search

Find specific text, variable names, or function names:

```
Find all files that contain 'RunnableTool'
```

```
Search for 'async executeAppleScript' in the codebase
```

```
Where is 'ANTHROPIC_API_KEY' used?
```

```
Find all occurrences of 'TODO' in the code
```

```
Search for the text 'Tool not found'
```

```
Where does the codebase mention 'Apple Notes'?
```

```
Find files containing 'input_schema'
```

### 2. Pattern/Regex Search

Use regex patterns to find variations or complex matches:

```
Find all functions that start with 'execute'
```

```
Search for all console.log statements
```

```
Find all imports from '@anthropic-ai/sdk'
```

```
Where are error messages that match 'failed to.*execute'?
```

```
Search for all function definitions matching 'async.*Tool'
```

```
Find all environment variables (pattern: 'process.env.')
```

```
Locate all class constructors (pattern: 'constructor\\(')
```

### 3. Code Structure Questions

Locate definitions, interfaces, and type declarations:

```
Find all class definitions
```

```
Search for interface definitions
```

```
Where are type guards defined?
```

```
Find all async functions
```

```
Search for all exported constants
```

```
Where are Zod schemas defined?
```

```
Find all enum declarations
```

### 4. Technology/Library Usage

Find where specific libraries or frameworks are used:

```
Where is Zod used for validation?
```

```
Find all AppleScript command strings
```

```
Search for all tool definitions
```

```
Where is child_process.exec called?
```

```
Find all uses of the Anthropic SDK
```

```
Where are Clack prompts used?
```

```
Search for dotenv configuration
```

### 5. Debugging/Investigation

Locate error handling, logging, and potential issues:

```
Find where the error 'Tool not found' is thrown
```

```
Search for all try-catch blocks
```

```
Where is the sendMessage function called?
```

```
Find all places that throw errors
```

```
Search for all console.error statements
```

```
Where are Promise rejections handled?
```

```
Find all TODO comments in TypeScript files
```

### 6. File Type Filtering

Search within specific file types:

```
Find 'export' statements in TypeScript files
```

```
Search for test assertions in test files
```

```
Find configuration in JSON files
```

```
Search for 'describe' blocks in test files only
```

```
Find all markdown files containing 'Testing'
```

```
Search for shell commands in bash scripts
```

### 7. Case-Insensitive Search

Find matches regardless of capitalization:

```
Find all references to 'anthropic' (case-insensitive)
```

```
Search for 'todo' comments regardless of case
```

```
Find 'Error' or 'error' in the codebase
```

### 8. Context Lines

Get surrounding code for better understanding:

```
Find 'executeAppleScript' and show 3 lines before and after each match
```

```
Search for 'throw new Error' with 5 lines of context
```

```
Find 'input_schema' and show 10 lines after each match
```

## Advanced Usage Examples

### Multiline Search

For patterns that span multiple lines:

```
Find struct definitions with fields across multiple lines
```

```
Search for multi-line template literals containing 'AppleScript'
```

### Output Modes

**Content Mode** (shows matching lines):
```
Show me the actual lines where 'RunnableTool' appears
```

**Files Only Mode** (just file paths):
```
Which files contain 'AppleScript'?
```

**Count Mode** (number of matches):
```
How many times does 'TODO' appear in each file?
```

### Combining Filters

```
Search for 'async' in TypeScript files under the src/ directory
```

```
Find 'test' in .ts files, case-insensitive, show line numbers
```

```
Search for error handling in tool files only
```

## Common Grep Patterns

### Finding Imports
```
Find all imports from local files (pattern: 'import.*from "\\.')
```

```
Search for all type imports (pattern: 'import type')
```

### Finding Function Definitions
```
Find all exported functions (pattern: 'export.*function')
```

```
Search for arrow function definitions (pattern: 'const.*=.*=>')
```

### Finding Comments
```
Find all single-line comments (pattern: '//')
```

```
Search for multi-line comment blocks (pattern: '/\\*')
```

### Finding Type Definitions
```
Find all type aliases (pattern: 'type.*=')
```

```
Search for interface definitions (pattern: 'interface \\w+')
```

## When NOT to Use Grep

These types of questions should use the **Task tool with Explore agent** instead:

**Architecture Questions:**
```
❌ "How does error handling work in this project?"
✅ Use Task/Explore agent
```

**Broad Exploration:**
```
❌ "What's the codebase structure?"
✅ Use Task/Explore agent
```

**Multi-Step Investigation:**
```
❌ "How are tools registered and executed?"
✅ Use Task/Explore agent
```

**Understanding Workflows:**
```
❌ "Walk me through how the message loop works"
✅ Use Task/Explore agent
```

**Grep is for finding, not for understanding.** If you need to explore, understand, or learn about the codebase architecture, use the Explore agent.

## Output Format Examples

### Files with Matches (Default)
```
src/index.ts
src/bashTool.ts
src/types.ts
```

### Content with Line Numbers
```
src/index.ts:42: export const myTool: RunnableTool = {
src/bashTool.ts:15: async function executeCommand(): Promise<void> {
src/types.ts:10: interface RunnableTool<T, U> {
```

### Match Counts
```
src/index.ts: 5 matches
src/bashTool.ts: 12 matches
src/types.ts: 2 matches
```

## Tips for Effective Grep Usage

1. **Be Specific**: Use exact strings when you know what you're looking for
2. **Use Regex for Patterns**: Leverage regex for flexible matching (e.g., `function\\s+\\w+`)
3. **Filter by File Type**: Use `type` parameter (e.g., "js", "ts", "py") for faster searches
4. **Limit Results**: Use `head_limit` for large codebases to get first N results
5. **Case Sensitivity**: Remember that grep is case-sensitive by default; specify case-insensitive when needed
6. **Escape Special Characters**: In Go code, use `interface\\{\\}` to find `interface{}`
7. **Context is Key**: Use `-A`, `-B`, or `-C` flags when you need surrounding code

## Ripgrep Pattern Syntax

The Grep tool uses ripgrep, which supports:
- **Literal strings**: `"TODO"`, `"async function"`
- **Regex patterns**: `"function\\s+\\w+"`, `"\\berror\\b"`
- **Word boundaries**: `"\\bexecute\\b"` (matches "execute" but not "executeCommand")
- **Character classes**: `"[A-Z]\\w+Tool"` (matches PascalCase tools)
- **Quantifiers**: `".*"`, `"+?"`, `"{2,4}"`
- **Groups**: `"(async|sync)"`, `"import .* from"`

**Important**: Literal braces in languages like Go require escaping: `interface\\{\\}` to match `interface{}`

## Limitations

- **Not for exploration**: Use Task/Explore for understanding codebase architecture
- **Single-line by default**: Use `multiline: true` for cross-line patterns
- **No file content operations**: Use Read tool to view full files
- **Binary files**: Automatically skipped
- **Large files**: May be truncated; use `head_limit` to control output size

## Performance

Grep is optimized for speed:
- Parallel directory traversal
- Memory-mapped file reading
- Automatic filtering of binary files and gitignore patterns
- Fast regex engine

For most codebases, searches complete in under 100ms.

## Integration with Other Tools

Grep works well in combination with other tools:

```
Search for 'executeAppleScript', then read the file where it's defined
```

```
Find all TODO comments, then create a summary in Apple Notes
```

```
Search for test files containing 'bashTool', then run those tests
```

## Additional Resources

- [Ripgrep Documentation](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)
- [Regex Tutorial](https://regexone.com/)
- [Computer Agent CLAUDE.md](../CLAUDE.md) - Project documentation
- [Types Definition](../src/types.ts) - Tool type definitions
