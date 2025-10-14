# Computer Agent

An AI-powered computer agent built with Anthropic's Claude Sonnet 4 model, designed for general-purpose computer tasks beyond just coding. This agent provides interactive, conversational access to your local files and macOS system applications through natural language commands.

## Overview

Computer Agent is a command-line interface (CLI) tool that combines Claude's advanced language understanding with practical tools for managing your digital workspace. Unlike traditional coding assistants, this agent can interact with your Notes, Calendar, Contacts, and file system, making it ideal for productivity automation, personal information management, and general computer tasks.

## Use Cases

- **Personal Productivity**: Manage calendar events, notes, and contacts through conversation
- **File Management**: Read, create, and modify files without leaving the terminal
- **Information Retrieval**: Search across notes, events, and contacts with natural language
- **Task Automation**: Chain multiple operations together (e.g., "Find my meeting notes and create a summary")
- **Data Organization**: Create and organize information across Apple's native apps
- **Quick Lookups**: Retrieve contact information, upcoming events, or note contents instantly

## Key Features

### AI-Powered Interaction
- **Claude Sonnet 4 Integration**: Leverages Anthropic's latest model for advanced natural language understanding and autonomous task execution
- **Conversational Interface**: Interactive CLI using @clack/prompts for a smooth user experience
- **Autonomous Agent Behavior**: Capable of multi-step task execution and tool chaining
- **Context-Aware**: Loads contextual information from files to provide personalized assistance

### Apple Ecosystem Integration

#### Apple Notes Management
- Search notes by title or content
- Create new notes with custom titles and body text
- Edit existing notes
- List all available notes
- Retrieve specific note content

#### Apple Calendar Integration
- List all available calendars
- View upcoming events with customizable time ranges
- Search events by title or description
- Create new calendar events with details
- Delete events
- Get today's events quickly
- Retrieve detailed event information (description, location, URL)

#### Apple Contacts Management
- Search contacts by name or organization
- Create new contacts with email, phone, organization, and birthday
- List all contacts
- Retrieve detailed contact information

### File System Operations

#### Text Editor Tool
- **View**: Read file contents or list directory contents, with optional line range specification
- **Create**: Create new files with initial content, automatically creating parent directories
- **String Replace**: Find and replace text in files
- **Insert**: Insert text at specific line numbers
- **Edit History**: Maintains undo history for file modifications

### Technical Highlights

- **Type-Safe**: Built with TypeScript for enhanced code reliability
- **Schema Validation**: Uses Zod for robust input validation and type inference
- **Minimal Dependencies**: Lean runtime with only essential packages
- **Modular Architecture**: Clean separation of concerns with dedicated tool modules
- **AppleScript Integration**: Native macOS automation through AppleScript execution
- **Error Handling**: Comprehensive error handling and user feedback
- **Tool System**: Extensible RunnableTool interface for easy addition of new capabilities

## Project Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

## Architecture

The agent follows a modular architecture:

- **[index.ts](src/index.ts)**: Main orchestration loop, message handling, and tool execution
- **[types.ts](src/types.ts)**: Core TypeScript interfaces and type definitions
- **[textEditorTool.ts](src/textEditorTool.ts)**: File system operations and text manipulation
- **[appleNotesTool.ts](src/appleNotesTool.ts)**: Apple Notes integration via AppleScript
- **[appleCalendarTool.ts](src/appleCalendarTool.ts)**: Apple Calendar integration via AppleScript
- **[appleContactsTool.ts](src/appleContactsTool.ts)**: Apple Contacts integration via AppleScript

## Requirements

- Node.js (with ES modules support)
- macOS (for Apple integration features)
- Anthropic API key
- Access permissions for Contacts, Calendar, and Notes apps

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```

4. Build and run:
   ```bash
   npm start
   ```

5. Grant necessary macOS permissions when prompted (Contacts, Calendar, Notes access)

## Configuration

Place a context file at `./tmp/ASSISTANT.md` to provide the agent with persistent context about your preferences, common tasks, or reference information. This content will be included in the system prompt.

## Development

- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Format**: `npm run format` - Runs Biome linter and formatter
- **Start**: `npm start` - Builds and runs the agent

## License

MIT
