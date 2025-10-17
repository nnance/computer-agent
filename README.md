# Computer Agent

An AI-powered autonomous agent built with Anthropic's Claude Sonnet 4 model, designed to perform tasks autonomously in offline-first, non-interactive environments. The agent can be triggered by events or schedules, operate as part of pipelines or workflows, and process data in batches without requiring real-time user interaction.

## Overview

Computer Agent is an offline-first AI agent that minimizes reliance on external APIs and services, enabling autonomous task execution based on predefined criteria or triggers. It can operate in two modes:

1. **Offline Mode (Primary)**: Runs autonomously as part of workflows, triggered by events or schedules, processing data in batches without user interaction
2. **Interactive Mode**: Provides a conversational CLI interface for testing, debugging, and direct interaction using the same context and tools as offline mode

This dual-mode approach ensures consistency between development and deployment while enabling both autonomous operation and hands-on control when needed.

## Use Cases

### Autonomous Operations
- **Scheduled Data Processing**: Run agents on a schedule to process batches of files, logs, or data
- **Event-Driven Workflows**: Trigger agents based on file changes, system events, or custom triggers
- **Pipeline Integration**: Integrate into CI/CD pipelines or data processing workflows
- **Batch Automation**: Perform recurring tasks without user intervention (e.g., daily report generation, data cleanup)
- **Monitoring & Alerts**: Autonomously monitor system state and take action based on predefined criteria

### Interactive Operations
- **Development & Testing**: Test agent behavior interactively before deploying to offline mode
- **Personal Productivity**: Manage calendar events, notes, and contacts through conversation
- **File Management**: Read, create, and modify files without leaving the terminal
- **Information Retrieval**: Search across notes, events, and contacts with natural language
- **Quick Lookups**: Retrieve contact information, upcoming events, or note contents instantly

## Key Features

### Offline-First Architecture
- **Autonomous Execution**: Operates without real-time user interaction, perfect for scheduled tasks and event-driven workflows
- **Minimal External Dependencies**: Designed to minimize reliance on external APIs and services
- **Non-Interactive by Default**: Optimized for batch processing and pipeline integration
- **Dual-Mode Support**: Same agent, context, and tools work in both offline and interactive modes

### AI-Powered Capabilities
- **Claude Sonnet 4 Integration**: Leverages Anthropic's latest model for advanced natural language understanding and autonomous task execution
- **Multi-Step Reasoning**: Capable of complex task execution and tool chaining without user intervention
- **Context-Aware**: Loads contextual information from files to provide personalized assistance
- **Interactive Mode**: Optional conversational CLI using @clack/prompts for testing and debugging

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
- **Tool System**: Extensible tool interface supporting both local execution (RunnableTool) and API-executed (PlainTool) patterns
- **Batch Processing**: Optimized for non-interactive operation in pipelines and workflows

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

3. Create a `.env` file with your configuration:
   ```
   ANTHROPIC_API_KEY=your_key_here
   APPLE_CALENDAR_NAME=your_calendar_name_here
   ```

   To find your calendar name, you can run the app first and use the `listCalendars` tool, or check your Apple Calendar app. Common values are your email address (e.g., `name@gmail.com`) or the calendar name as shown in the Calendar app.

4. Build and run:
   ```bash
   # Interactive mode (for testing and debugging)
   npm start

   # Non-interactive mode (for autonomous operation)
   npm start -- -m "Your task here"
   ```

5. Grant necessary macOS permissions when prompted (Contacts, Calendar, Notes access)

### Running Modes

#### Interactive Mode (Development & Testing)
Start a conversational session to test agent behavior:
```bash
npm start
```

The agent will prompt you and wait for input. This mode uses the same context and tools as offline mode, ensuring consistency.

#### Non-Interactive Mode (Autonomous Operation)
Execute a single task without interaction:
```bash
# Using -m flag
npm start -- -m "Process today's calendar events and create a summary"

# Using --message flag
npm start -- --message "Check for new files in ./data and process them"
```

This mode is ideal for:
- Scheduled tasks (cron jobs, system timers)
- Event-driven workflows (file watchers, webhooks)
- CI/CD pipeline integration
- Batch processing operations

## Configuration

### Required Configuration

- **`ANTHROPIC_API_KEY`**: Your Anthropic API key for Claude Sonnet 4 access
- **`APPLE_CALENDAR_NAME`**: The default calendar name to use for calendar operations (e.g., your email address or calendar name from Apple Calendar app)

### Optional Configuration

- **Context File**: Place a context file at `./.agent/ASSISTANT.md` (configurable via `CONTEXT_FILE_PATH` env variable) to provide the agent with persistent context about your preferences, common tasks, or reference information. This content will be included in the system prompt.

See [.env.example](.env.example) for all available configuration options.

## Development

- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Format**: `npm run format` - Runs Biome linter and formatter
- **Start**: `npm start` - Builds and runs the agent

## License

MIT
