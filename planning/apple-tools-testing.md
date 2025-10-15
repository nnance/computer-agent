# Apple Tools Testing Implementation Plan

**Feature**: Comprehensive Test Coverage for Apple Notes, Calendar, and Contacts Tools
**Date**: 2025-10-13
**Status**: ✅ Completed
**Author**: Claude Code (with Nick Nance)

## Overview

Create comprehensive test suites for all three Apple tools (Notes, Calendar, Contacts) using mocked AppleScript responses. The tests should follow the same pattern as the existing `textEditorTool.test.ts` and never execute actual AppleScript commands.

## Objectives

1. Achieve comprehensive test coverage for all Apple tool integrations
2. Use Vitest mocking to avoid executing AppleScript commands
3. Test all success scenarios, error cases, and edge cases
4. Validate Zod input schemas
5. Maintain consistency with existing test patterns

## Files to Create

### 1. appleNotesTool.test.ts

**Test Coverage for 5 Tools:**
- `searchNotes` - Search notes by query in title or content
- `createNote` - Create new note with title and optional body
- `editNote` - Edit existing note body by title
- `listNotes` - List all notes
- `getNoteContent` - Get content of specific note by title

**Test Categories:**
- ✅ Zod schema validation
  - Valid inputs with all parameters
  - Valid inputs with only required parameters
  - Missing required fields
  - Invalid field types
- ✅ Success cases
  - Multiple notes with proper parsing of delimited format (id|||name|||body)
  - Single note results
  - Empty note bodies
- ✅ Error handling
  - AppleScript execution failures
  - Empty/null results
  - Note not found scenarios
- ✅ Edge cases
  - Special characters in queries
  - Console.log output verification
- ✅ Tool metadata validation

**Mock Data Format:**
```
id1|||Note Title|||Note Body:::id2|||Another Note|||Another Body
```

### 2. appleCalendarTool.test.ts

**Test Coverage for 7 Tools:**
- `listCalendars` - List all available calendars
- `listEvents` - List events with optional calendar name and days parameters
- `searchEvents` - Search events by query with optional parameters
- `createEvent` - Create event with required and optional fields
- `deleteEvent` - Delete event by calendar and title
- `getTodayEvents` - Get today's events from default calendar
- `getEventDetails` - Get detailed event info including description, location, URL

**Test Categories:**
- ✅ Zod schema validation
  - All parameters (required + optional)
  - Only required parameters
  - Optional parameters (calendarName, days, description)
  - Type validation (numbers for days)
  - Missing required fields
- ✅ Success cases
  - Default parameters (uses "nance.nick@gmail.com" calendar, 7 days)
  - Custom parameters
  - Events with all optional fields
  - Events with empty optional fields
- ✅ Error handling
  - AppleScript failures
  - Empty results
  - Event/calendar not found
- ✅ Edge cases
  - Multiple events parsing
  - Date format handling
  - Console output verification
- ✅ Tool metadata validation

**Mock Data Formats:**
```
Calendar List: "Work, Personal, Family" (comma-separated)
Events: "Summary|||StartDate|||EndDate|||Calendar" (4 fields)
Event Details: "Summary|||StartDate|||EndDate|||Calendar|||Description|||Location|||URL" (7 fields)
```

### 3. appleContactsTool.test.ts

**Test Coverage for 4 Tools:**
- `searchContacts` - Search contacts by name or organization
- `createContact` - Create contact with name and optional fields
- `listContacts` - List all contacts
- `getContact` - Get specific contact by name

**Test Categories:**
- ✅ Zod schema validation
  - All parameters (name, email, phone, organization, birthday)
  - Only required parameter (name)
  - Combinations of optional parameters
  - Missing required fields
- ✅ Success cases
  - Multiple contacts with arrays of emails/phones
  - Single email/phone
  - No emails/phones (empty arrays)
  - Optional organization and birthday fields
- ✅ Error handling
  - AppleScript failures
  - Empty results
  - Contact not found
- ✅ Edge cases
  - Multiple emails: "email1,email2,email3" (comma-separated)
  - Multiple phones: "phone1,phone2,phone3" (comma-separated)
  - Empty organization ("missing value" from AppleScript)
  - Search by name vs organization
  - Console output verification
- ✅ Tool metadata validation

**Mock Data Format:**
```
id|||Name|||email1,email2|||phone1,phone2|||Organization|||Birthday
```
6 fields separated by `|||`, arrays within fields separated by `,`

## Mocking Strategy

### Technology
- **Framework**: Vitest with `vi.mock()` and `vi.mocked()`
- **Target**: `child_process.exec` function
- **Pattern**: Mock at module level, implement per-test responses

### Mock Implementation Pattern

```typescript
// Mock the module
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

// In each test, mock the specific response
vi.mocked(exec).mockImplementation((cmd, callback) => {
  callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
  return {} as any;
});

// For errors
vi.mocked(exec).mockImplementation((cmd, callback) => {
  callback?.(new Error("AppleScript error"), { stdout: "", stderr: "" } as any, "");
  return {} as any;
});
```

### Mock Response Formats

All Apple tools use delimited string formats returned by AppleScript:

1. **Field Delimiter**: `|||` separates fields within a record
2. **Record Delimiter**: `:::` separates multiple records
3. **Array Delimiter**: `,` separates items within array fields (emails, phones)

**Important**: When mocking, count delimiters carefully:
- N fields require N-1 delimiters
- Empty fields are represented as empty strings between delimiters
- Trailing delimiters may result in undefined values for final fields

### Console Spy Setup

```typescript
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});
```

## Test Organization

### File Structure
```
src/__tests__/
├── appleNotesTool.test.ts      (34 tests)
├── appleCalendarTool.test.ts   (49 tests)
├── appleContactsTool.test.ts   (35 tests)
├── textEditorTool.test.ts      (34 tests - existing)
└── example.test.ts             (6 tests - existing)
```

### Test Structure Per File

```typescript
describe("toolName", () => {
  // Setup/teardown
  beforeEach(() => { /* ... */ });
  afterEach(() => { /* ... */ });

  describe("Zod input validation", () => {
    describe("toolFunction1", () => {
      it("should validate correct input", () => { /* ... */ });
      it("should reject invalid input", () => { /* ... */ });
    });
    // ... more tool functions
  });

  describe("toolFunction1", () => {
    it("should handle success case", async () => { /* ... */ });
    it("should handle error case", async () => { /* ... */ });
    it("should handle edge case", async () => { /* ... */ });
  });

  describe("tool metadata", () => {
    it("should have correct tool name", () => { /* ... */ });
  });
});
```

## Key Testing Principles

### 1. Never Execute AppleScript
- All `child_process.exec` calls are mocked
- No actual system commands are executed
- No macOS permissions required to run tests

### 2. Realistic Mock Data
- Use the same delimited format as actual AppleScript responses
- Include edge cases like empty fields, special characters
- Match the data structure returned by real implementations

### 3. Comprehensive Coverage
- Test all input combinations (required + optional parameters)
- Test all output scenarios (success, failure, empty, not found)
- Validate both the data structure and console output
- Verify tool metadata (names, descriptions)

### 4. Isolation
- Each test is independent
- Mocks are cleared between tests
- No shared state between tests

### 5. Clarity
- Descriptive test names
- Comments explaining mock data format
- Clear arrange-act-assert structure

## Common Pitfalls & Solutions

### Problem: Delimiter Count Errors
**Issue**: Mock string has wrong number of delimiters, causing undefined values or incorrect parsing

**Solution**:
- Count fields first (e.g., 7 fields)
- Use N-1 delimiters (6 delimiters for 7 fields)
- Add comments to mock strings showing expected field count
```typescript
// Format: field1|||field2|||field3 (3 fields, 2 delimiters)
const mockOutput = "value1|||value2|||value3";
```

### Problem: Empty vs Undefined Fields
**Issue**: Empty strings ("") vs undefined values in parsed results

**Solution**: Understand how `.split()` works:
- `"A|||B|||"` → `["A", "B", ""]` (empty string)
- `"A|||B"` → `["A", "B"]` when destructuring 3 items gives `undefined` for 3rd
- Match expectations based on actual implementation behavior

### Problem: Array Fields
**Issue**: Handling comma-separated values within fields

**Solution**:
- Use ternary operator: `emails: emailsStr ? emailsStr.split(",") : []`
- Empty string becomes empty array, not array with empty string
- Test both filled and empty array scenarios

### Problem: AppleScript "missing value"
**Issue**: AppleScript returns literal string "missing value" for some null fields

**Solution**:
- Include in mock data where appropriate (e.g., organization field)
- Understand that code may or may not convert this to undefined
- Test actual behavior of implementation

## Validation Checklist

- [x] All tools have Zod validation tests
- [x] Success cases with realistic mock data
- [x] Error handling for AppleScript failures
- [x] Edge cases (empty results, special chars, optional fields)
- [x] Console output verification (success/failure messages)
- [x] Tool metadata verification
- [x] No actual AppleScript execution
- [x] Proper mock cleanup in afterEach
- [x] All tests pass

## Results

### Test Execution
```bash
npm test
```

**Final Results:**
- ✅ 5 test files passed
- ✅ 158 tests passed
- ❌ 0 failures
- ⏱️ Duration: ~300ms

### Test Distribution
- appleNotesTool.test.ts: 34 tests
- appleCalendarTool.test.ts: 49 tests
- appleContactsTool.test.ts: 35 tests
- textEditorTool.test.ts: 34 tests (existing)
- example.test.ts: 6 tests (existing)

### Coverage Summary
All major code paths covered:
- Input validation (Zod schemas)
- Successful execution paths
- Error handling paths
- Edge cases and boundary conditions
- Data parsing logic
- Console output

## Future Enhancements

### Potential Improvements
1. **Coverage Reporting**: Add detailed coverage metrics using Vitest's coverage tool
2. **Integration Tests**: Add optional integration tests that run actual AppleScript (macOS only)
3. **Mock Factories**: Create helper functions to generate common mock responses
4. **Negative Testing**: More comprehensive invalid input testing
5. **Performance Tests**: Test behavior with large datasets
6. **Snapshot Testing**: Use snapshots for complex output validation

### Maintenance Notes
- Keep mock data format in sync with AppleScript implementation
- Update tests when Zod schemas change
- Add tests for any new tools or features
- Regularly review and update edge cases based on production issues

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Zod Schema Validation](https://zod.dev/)
- Project: [CLAUDE.md](../CLAUDE.md) - Project architecture and patterns
- Existing Test: [textEditorTool.test.ts](../src/__tests__/textEditorTool.test.ts) - Reference pattern

## Lessons Learned

1. **Mock Data Precision**: Exact delimiter count matters - off-by-one errors in delimiters cause test failures
2. **Type Inference**: TypeScript infers types from Zod schemas via `z.infer<typeof Schema>`
3. **Console Mocking**: Must mock both `console.log` and `console.error` to avoid cluttering test output
4. **Async Testing**: Always use `async/await` with tool `run()` methods
5. **Mock Isolation**: Clear mocks between tests to prevent interference
6. **Error Messages**: Test both successful responses and error messages from tools
7. **Optional Parameters**: Test with and without optional parameters to ensure defaults work correctly
8. **Array Parsing**: Empty strings vs empty arrays - understand the difference and test both

---

**Implementation Completed**: 2025-10-13
**Total Time**: ~1 hour
**Test Success Rate**: 100% (158/158 passing)
