# Proposed Implementation Plan

## 1. Add CLI flags for output control
- --format=json|text (default: text)
- --verbose or --quiet flag to control visibility of tool execution details
- Update parseArgs.ts and showHelp() accordingly

## 2. Create new output handlers
- JSON output handler: Collects all messages, tool calls, and results into a structured JSON object for final output
- Text output handler with visibility: Uses clack/prompts (same as interactive mode) for rich visual feedback
- Text output handler without visibility: Minimal text output - only shows final assistant responses

## 3. Update the message loop
- Modify sendMessage() to work with all three output handler types
- Ensure JSON format captures the complete conversation structure including:
  - User messages
  - Assistant text responses
  - Tool calls with inputs
  - Tool results
  - Stop reasons

## 4. Update runNonInteractiveMode()
- Accept parsed arguments for format and verbosity preferences
- Select appropriate output handler based on flags
- For JSON format: output the complete JSON structure at the end

## 5. JSON output structure
```json
{
  "messages": [
    {
      "role": "user" | "assistant",
      "content": [...],
      "timestamp": "ISO-8601"
    }
  ],
  "toolCalls": [
    {
      "name": string,
      "input": object,
      "result": object,
      "success": boolean,
      "timestamp": "ISO-8601"
    }
  ],
  "stopReason": string,
  "model": string,
  "tokensUsed": number (if available)
}
```