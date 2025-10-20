import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, log, text } from "@clack/prompts";
import {
	createInteractiveOutput,
	createOutputHandler,
	isJsonOutputHandler,
} from "./helpers/outputHandler.js";
import { parseArgs, showHelp } from "./helpers/parseArgs.js";
import { sendMessage } from "./helpers/toolRunner.js";
import { loadContext, stopReason } from "./helpers/utilities.js";
import { appleCalendarTools } from "./tools/appleCalendarTool.js";
import { appleContactsTools } from "./tools/appleContactsTool.js";
import { appleNotesTools } from "./tools/appleNotesTool.js";
import { bashTool } from "./tools/bashTool.js";
import { grepTool } from "./tools/grepTool.js";
import { textEditorTool } from "./tools/textEditorTool.js";
import type { Tool } from "./tools/types.js";
import { webFetchTool } from "./tools/webFetchTool.js";
import { webSearchTool } from "./tools/webSearchTool.js";

const tools: Tool[] = [
	...appleNotesTools,
	...appleCalendarTools,
	...appleContactsTools,
	textEditorTool,
	bashTool,
	grepTool,
	webSearchTool,
	webFetchTool,
];
const contextFile = process.env.CONTEXT_FILE_PATH || "./.agent/ASSISTANT.md";
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const maxTokens = Number.parseInt(
	process.env.ANTHROPIC_MAX_TOKENS || "1024",
	10,
);
const anthropic = new Anthropic({
	defaultHeaders: {
		"anthropic-beta": "web-fetch-2025-09-10",
	},
});

async function runInteractiveMode(
	systemPrompt: string,
	debug: boolean,
): Promise<void> {
	const messages: Anthropic.Messages.MessageParam[] = [];
	const output = createInteractiveOutput(debug);

	let value = await text({
		message: "How can I help you?",
	});

	while (!isCancel(value)) {
		messages.push({ role: "user", content: value });

		// Send the message to the model and get a final response
		const newMessages = await sendMessage(
			anthropic,
			model,
			maxTokens,
			tools,
			systemPrompt,
			messages,
			output,
			stopReason,
		);
		messages.push(...newMessages);

		// Prompt for the next input
		value = await text({
			message: "How can I help you?",
		});
	}

	log.success("Goodbye!");
}

async function runNonInteractiveMode(
	systemPrompt: string,
	message: string,
	format: "json" | "text",
	verbose: boolean,
	debug: boolean,
): Promise<void> {
	const messages: Anthropic.Messages.MessageParam[] = [];
	const output = createOutputHandler(format, verbose, debug, model);

	messages.push({ role: "user", content: message });

	// Track user message for JSON output
	if (isJsonOutputHandler(output)) {
		output.addUserMessage(message);
	}

	// Send the message to the model and get a final response
	const newMessages = await sendMessage(
		anthropic,
		model,
		maxTokens,
		tools,
		systemPrompt,
		messages,
		output,
		stopReason,
	);
	messages.push(...newMessages);

	// Output JSON if that format was requested
	if (isJsonOutputHandler(output)) {
		output.output();
	}
}

async function main() {
	const systemPrompt = loadContext(contextFile);

	// Read DEBUG environment variable (default: false)
	const debugEnv = process.env.DEBUG === "true";

	// Parse command-line arguments (skip first two: node and script path)
	const args = process.argv.slice(2);

	try {
		const parsed = parseArgs(args);

		// CLI debug flag overrides environment variable
		const debug = parsed.debug || debugEnv;

		if (parsed.help) {
			// Create temporary output handler just for help text
			const helpOutput = createInteractiveOutput(debug);
			showHelp(helpOutput);
			process.exit(0);
		}

		if (parsed.message) {
			// Non-interactive mode
			await runNonInteractiveMode(
				systemPrompt,
				parsed.message,
				parsed.format,
				parsed.verbose,
				debug,
			);
		} else {
			// Interactive mode
			await runInteractiveMode(systemPrompt, debug);
		}
	} catch (error) {
		if (error instanceof Error) {
			const debug =
				debugEnv ||
				process.argv.includes("-d") ||
				process.argv.includes("--debug");
			const errorOutput = createInteractiveOutput(debug);
			errorOutput.showError(`Error: ${error.message}`);
			showHelp();
			process.exit(1);
		}
		throw error;
	}
}

main();
