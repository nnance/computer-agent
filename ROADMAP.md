# Project Roadmap

This document outlines the planned features, improvements, and milestones for the project. It serves as a guide for development priorities and timelines.

## Improvements / Bug Fixes

Minor improvements and bug fixes that enhance the current functionality.

[x] **System Prompt**: Improve the default location of the system prompt and make it more customizable
[x] **Testing Infrastructure**: Add comprehensive test suite
[ ] **Error Handling**: More robust error handling and user feedback
[ ] **Configuration System**: Move hardcoded values to config file
[ ] **Logging**: Implement structured logging system

## Features

Major features that will significantly enhance the capabilities of the project.

[ ] **CLI Arguments**: Add support for command-line arguments to call the agent without interactive mode
[ ] **Project Structure**: Opionated project structure for AI agents.  Reference [here](https://x.com/trq212/status/1944877527044120655)
[ ] **Tool Discovery**: Auto-discover tools from directory
[ ] **Context Management**: Improve handling of long conversations
[ ] **Web Integration**: Add web search or API calling capabilities
[ ] **Plugin System**: Allow third-party plugins to extend functionality
[ ] **Memory**: Add persistent conversation memory across sessions
[ ] **Streaming**: Implement streaming responses for better UX
[ ] **Security**: Implement sandboxing for file operations

## Additional Tools

[ ] **WebFetch**: Fetches content from a URL and processes it using an AI model.

**Parameters:**
- `url`: The URL to fetch content from (required)
- `prompt`: The prompt to run on the fetched content (required)

**Notes:**
- Converts HTML to markdown
- HTTP URLs automatically upgraded to HTTPS
- 15-minute cache for faster responses

---

[ ] **GREP**: Powerful search tool built on ripgrep for searching file contents.

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
