# Project Roadmap

This document outlines the planned features, improvements, and milestones for the project. It serves as a guide for development priorities and timelines.

Shift the direction of the project towards a more offline-first approach, minimizing reliance on external APIs and services that can operate from a non-interactive environment.  Triggered by an event or a schedule.  

The core concept is to have an AI agent that can perform tasks autonomously without requiring real-time user interaction.   This would happen as part of a pipeline or workflow where data is processed in batches or as part of a larger system and the AI agent performs its tasks based on predefined criteria or triggers.

Interactive mode should still be supported to allow the user to engage with the agent using the exact same context and tools that would be used in offline mode.   This ensures consistency and allows for testing and debugging of the agent's behavior before deploying it in an offline context.

## Improvements / Bug Fixes

Minor improvements and bug fixes that enhance the current functionality.

[ ] **Helper Functions**: Move parseArgs, output handler, and tool runner to separate modules in the helpers directory
[ ] **Output Handling**: Improve output handling for better formatting and readability for non-interactive mode
[ ] **Logging**: Implement structured logging system
[ ] **Output Logging**: Remove hardcoded console logs and replace with a configurable logging system
[x] **System Prompt**: Improve the default location of the system prompt and make it more customizable
[x] **Testing Infrastructure**: Add comprehensive test suite
[ ] **Error Handling**: More robust error handling and user feedback
[x] **Configuration System**: Move hardcoded values to config file

## Features

Major features that will significantly enhance the capabilities of the project.

[x] **CLI Arguments**: Add support for command-line arguments to call the agent without interactive mode
[ ] **Project Structure**: Opionated project structure for AI agents.  Reference [here](https://x.com/trq212/status/1944877527044120655)
[ ] **Configurable Agent**: Make the primary agent configurable via a config file, system prompt, tools, etc.
[ ] **Agent Configurations**: Predefined agent configurations for common tasks
[ ] **Tool Discovery**: Auto-discover tools from directory
[ ] **Context Management**: Improve handling of long conversations
[ ] **Web Integration**: Add web search or API calling capabilities
[ ] **Plugin System**: Allow third-party plugins to extend functionality
[ ] **Memory**: Add persistent conversation memory across sessions
[ ] **Streaming**: Implement streaming responses for better UX
[ ] **Security**: Implement sandboxing for file operations

## Additional Tools

[x] **WebFetch**: Fetches content from a URL and processes it using an AI model.

**Parameters:**
- `url`: The URL to fetch content from (required)
- `prompt`: The prompt to run on the fetched content (required)

**Notes:**
- Converts HTML to markdown
- HTTP URLs automatically upgraded to HTTPS
- 15-minute cache for faster responses

---

[x] **GREP**: Powerful search tool built on ripgrep for searching file contents.

**Parameters:**
- `pattern`: Regular expression pattern to search for (required)
- `path`: File or directory to search in (optional)
- `output_mode`: "content", "files_with_matches", or "count" (default: "files_with_matches")
- `type`: File type to search (e.g., "js", "py", "rust")
- `glob`: Glob pattern to filter files (e.g., "*.js")
- `-i`: Case insensitive search
- `-n`: Show line numbers
- `-A`: Lines to show after match
- `-B`: Lines to show before match
- `-C`: Lines to show before and after match
- `multiline`: Enable multiline mode
- `head_limit`: Limit output to first N lines/entries

---

[ ] **GLOB**: Fast file pattern matching tool that works with any codebase size.

**Parameters:**
- `pattern`: The glob pattern to match files against (required)
- `path`: The directory to search in (optional, defaults to current directory)

**Examples:**
- `**/*.js` - All JavaScript files
- `src/**/*.ts` - All TypeScript files in src directory

---

[ ] **Task**:  Launch a new agent to handle complex, multi-step tasks autonomously.

**Available agent types:**
- `general-purpose`: For researching complex questions, searching for code, and executing multi-step tasks

**Parameters:**
- `description`: Short description of the task (3-5 words)
- `prompt`: The task for the agent to perform
- `subagent_type`: The type of specialized agent to use

---
