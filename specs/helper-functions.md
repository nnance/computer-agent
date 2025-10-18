# Plan: Refactor Helper Functions to **src/helpers/** Directory

## 1. Create new directory structure
- Create src/helpers/ directory

## 2. Move and refactor parseArgs module
- Move src/parseArgs.ts → src/helpers/parseArgs.ts
- Update test file path from src/__tests__/parseArgs.test.ts to src/__tests__/helpers/parseArgs.test.ts
- Update import paths in test file

## 3. Create outputHandler module (src/helpers/outputHandler.ts)
- Extract from index.ts:
- OutputHandler interface (lines 16-24)
- interactiveOutput implementation (lines 48-57)
- nonInteractiveOutput implementation (lines 60-68)
- Export factory functions or constants for both handlers

## 4. Create toolRunner module (src/helpers/toolRunner.ts)
- Extract from index.ts:
- processToolCall() function (lines 111-153)
- sendMessage() function (lines 155-215) - the full agentic loop
- These functions will need to accept dependencies (tools array, anthropic client, output handler) as parameters

## 5. Create utilities module (src/helpers/utilities.ts)
- Extract from index.ts:
- loadContext() function (lines 70-88)
- stopReason() function (lines 90-109)

## 6. Update src/index.ts
- Remove all extracted code
- Import helper modules from src/helpers/
- Maintain same functionality with cleaner structure
- Keep: tool imports, configuration, main() function, mode runners

## 7. Create tests for new modules
- Create src/__tests__/helpers/outputHandler.test.ts
- Create src/__tests__/helpers/toolRunner.test.ts
- Create src/__tests__/helpers/utilities.test.ts

## 8. Verify and test
- Run npm run build to check TypeScript compilation
- Run npm test to ensure all tests pass
- Run npm run format to apply Biome formatting

## Expected outcome:
- Cleaner, more modular codebase
- Better separation of concerns
- Easier to test individual components
- index.ts reduced from ~293 lines to ~100-120 lines