interface ParsedArgs {
	message: string | undefined;
	help: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
	const result: ParsedArgs = {
		message: undefined,
		help: false,
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
			if (nextArg !== undefined) {
				result.message = nextArg;
				i++; // Skip next argument as we've consumed it
			} else {
				throw new Error(`${arg} requires a message argument`);
			}
		} else if (!arg.startsWith("-")) {
			// If no flag and no message yet, treat as message
			if (result.message === undefined) {
				result.message = arg;
			}
		}
	}

	return result;
}

export function showHelp(): void {
	console.log(`
Computer Agent - CLI Tool

Usage:
  npm start                    Start in interactive mode
  npm start -- -m <message>    Send a single message (non-interactive)
  npm start -- --message <msg> Send a single message (non-interactive)
  npm start -- -h              Show this help message
  npm start -- --help          Show this help message

Examples:
  npm start
  npm start -- -m "What's on my calendar today?"
  npm start -- --message "Add a note titled 'Meeting' with content 'Discuss project'"

Interactive Mode:
  When started without arguments, enters interactive mode where you can
  have a multi-turn conversation with the agent.

Non-Interactive Mode:
  When started with -m or --message, sends a single message and exits
  after receiving the complete response.
`);
}
