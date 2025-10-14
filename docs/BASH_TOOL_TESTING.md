# Bash Tool Testing Guide

This guide provides example commands and scenarios for testing the bash tool implementation.

## Basic Commands

Test fundamental command execution:

```
"List files in the current directory"
"Show the current date and time"
"Echo hello world"
"What is my current working directory?"
```

## Directory Navigation

Test session persistence with working directory changes:

```
"Change to the src directory and list the files"
"Go to the parent directory and show where I am"
"Navigate to /tmp and create a test file called hello.txt"
```

**Expected behavior**: The working directory should persist across commands within the same session.

## Environment Variables

Test session state with environment variable management:

```
"Set an environment variable TEST_VAR to hello and then echo it"
"Show all environment variables that contain PATH"
```

**Expected behavior**: Environment variables set with `export` should persist across commands in the session.

## File Operations

Test file system interactions:

```
"Create a new file test.txt with the content 'Hello World'"
"Read the contents of package.json"
"Count the number of lines in src/index.ts"
"Find all TypeScript files in the src directory"
```

## Git Commands

Test version control operations:

```
"Show git status"
"List the last 5 git commits"
"Show what branch I'm on"
"Show git diff for staged changes"
```

## Multi-step Workflows

Test autonomous execution with complex, multi-step tasks:

```
"Create a directory called test-dir, navigate into it, create a file called readme.md with 'Test' as content, then list the files"
"Show me the package.json version, then list all TypeScript files, then show git status"
```

**Expected behavior**: The agent should autonomously execute multiple bash tool calls in sequence to complete the task.

## Security Testing

Test that dangerous commands are properly blocked:

### Interactive Commands (Should be blocked)
```
"Run vim"
"Open nano"
"Start top"
"Use less to view a file"
```

**Expected behavior**: Should return error: "Interactive commands are not supported"

### Dangerous System Commands (Should be blocked)
```
"Execute rm -rf /"
"Format a disk with mkfs"
"Run shutdown now"
"Reboot the system"
```

**Expected behavior**: Should return error: "Blocked for security: Command matches blocked pattern for system safety"

### Fork Bomb (Should be blocked)
```
"Run this command: :(){ :|:& };:"
```

**Expected behavior**: Should be blocked by security patterns.

## Error Handling

Test graceful handling of error conditions:

### Command Not Found
```
"Run a command that doesn't exist called fakecommand"
```

**Expected behavior**: Should return "Command not found" error.

### File Not Found
```
"Read a file that doesn't exist at /fake/path/file.txt"
```

**Expected behavior**: Should execute but return empty output or error from bash.

### Invalid Directory
```
"Change to a directory that doesn't exist called /fake/directory"
```

**Expected behavior**: Should return bash error, session working directory should remain unchanged.

### Timeout Testing
```
"Sleep for 5 seconds"
"Run a command that takes 31 seconds to complete"
```

**Expected behavior**: First should complete successfully, second should timeout after 30 seconds.

## Session Management

Test session restart functionality:

```
"Set an environment variable TEST=foo"
"Echo $TEST"  (should output "foo")
"Restart the bash session"
"Echo $TEST"  (should output empty - variable should be cleared)
```

**Expected behavior**: Session restart should reset working directory and environment variables to initial state.

## Complex Real-World Scenarios

### Development Workflow
```
"Show me the current git branch, list uncommitted changes, and count the number of TypeScript files in src/"
```

### System Information
```
"Show me the system uptime, available disk space, and current memory usage"
```

### Build Verification
```
"Run npm test and show me if it passed"
"Build the project and tell me if there were any errors"
```

## Tips for Testing

1. **Start Simple**: Begin with basic commands to verify the tool is working correctly
2. **Test Persistence**: Verify that working directory and environment variables persist across commands
3. **Test Security**: Confirm that dangerous and interactive commands are properly blocked
4. **Test Autonomy**: Use multi-step requests to verify the agentic loop executes multiple tool calls
5. **Check Errors**: Ensure error conditions are handled gracefully with informative messages
6. **Verify Output**: Check that stdout and stderr are properly captured and returned
7. **Test Timeout**: Verify that long-running commands are properly terminated after 30 seconds

## Expected Tool Output Format

The bash tool returns a `BashResult` object with:
- `success: boolean` - Indicates if the command executed successfully
- `stdout?: string` - Standard output from the command
- `stderr?: string` - Standard error output (if any)
- `error?: string` - Error message if execution failed

Example successful output:
```json
{
  "success": true,
  "stdout": "index.ts\nbashTool.ts\ntypes.ts"
}
```

Example error output:
```json
{
  "success": false,
  "error": "Command not found"
}
```
