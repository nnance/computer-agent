export type OutputFormat = "json" | "text";

export interface ParsedArgs {
	message: string | undefined;
	help: boolean;
	format: OutputFormat;
	verbose: boolean;
	debug: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
	const result: ParsedArgs = {
		message: undefined,
		help: false,
		format: "text",
		verbose: false,
		debug: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (!arg) {
			continue;
		}

		if (arg === "-h" || arg === "--help") {
			result.help = true;
		} else if (arg === "-m" || arg === "--message") {
			// Next argument should be the message
			const nextArg = args[i + 1];
			if (
				nextArg !== undefined &&
				!nextArg.startsWith("-") &&
				nextArg.trim() !== ""
			) {
				result.message = nextArg;
				i++; // Skip next argument as we've consumed it
			} else {
				throw new Error(`${arg} requires a message argument`);
			}
		} else if (arg === "--format") {
			const nextArg = args[i + 1];
			if (nextArg !== undefined) {
				if (nextArg === "json" || nextArg === "text") {
					result.format = nextArg;
					i++;
				} else {
					throw new Error(
						`${arg} must be either 'json' or 'text', got '${nextArg}'`,
					);
				}
			} else {
				throw new Error(`${arg} requires a format argument (json or text)`);
			}
		} else if (arg === "--verbose" || arg === "-v") {
			result.verbose = true;
		} else if (arg === "--quiet" || arg === "-q") {
			result.verbose = false;
		} else if (arg === "-d" || arg === "--debug") {
			result.debug = true;
		} else if (!arg.startsWith("-")) {
			// If no flag and no message yet, treat as message
			if (result.message === undefined) {
				result.message = arg;
			}
		}
	}

	return result;
}

export function showHelp(output?: { showHelp: (text: string) => void }): void {
	const helpText = `
Computer Agent - CLI Tool

Usage:
  npm start                    Start in interactive mode
  npm start -- -m <message>    Send a single message (non-interactive)
  npm start -- --message <msg> Send a single message (non-interactive)
  npm start -- -h              Show this help message
  npm start -- --help          Show this help message

Options:
  -m, --message <text>         Message to send (enables non-interactive mode)
  -h, --help                   Show this help message
  --format <json|text>         Output format for non-interactive mode (default: text)
  -v, --verbose                Show detailed tool execution information
  -q, --quiet                  Minimal output (only final responses)
  -d, --debug                  Enable debug logging to stderr

Examples:
  npm start
  npm start -- -m "What's on my calendar today?"
  npm start -- -m "Search for TypeScript best practices" --verbose
  npm start -- -m "List my notes" --format json
  npm start -- --message "Add a note" --quiet
  npm start -- -m "Test query" --debug

Interactive Mode:
  When started without arguments, enters interactive mode where you can
  have a multi-turn conversation with the agent.

Non-Interactive Mode:
  When started with -m or --message, sends a single message and exits
  after receiving the complete response.

  Output Formats:
    text (default) - Human-readable formatted output
    json           - Structured JSON output for programmatic use

  Verbosity Levels:
    --verbose - Show thinking indicators and tool execution details
    --quiet   - Only show final assistant responses (default)

Debug Mode:
  When enabled via -d, --debug flag or DEBUG=true environment variable,
  debug output is written to stderr with diagnostic messages.
  Does not interfere with JSON output or regular tool output.
`;

	if (output && typeof output.showHelp === "function") {
		output.showHelp(helpText);
	} else {
		process.stdout.write(`${helpText}\n`);
	}
}
