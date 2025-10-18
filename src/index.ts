import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, log, spinner, text } from "@clack/prompts";
import {
	JsonOutputHandler,
	type OutputHandler,
	TextOutputHandlerWithVisibility,
	createOutputHandler,
} from "./helpers/outputHandlers.js";
import { parseArgs, showHelp } from "./parseArgs.js";
import { appleCalendarTools } from "./tools/appleCalendarTool.js";
import { appleContactsTools } from "./tools/appleContactsTool.js";
import { appleNotesTools } from "./tools/appleNotesTool.js";
import { bashTool } from "./tools/bashTool.js";
import { grepTool } from "./tools/grepTool.js";
import { handleView, textEditorTool } from "./tools/textEditorTool.js";
import { isRunnableTool, type Tool } from "./tools/types.js";
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

function loadContext(filePath: string): string {
	const contextInfo = handleView(filePath)?.content || "No context available";

	log.info(`Loaded context: ${contextInfo.length} characters.`);

	const systemPrompt = `
		You are a helpful assistant that can use tools to interact with the user's Apple Notes, Calendar, Contacts, local text files, execute bash commands, search the web, and fetch web content. Use the provided tools to fulfill user requests as needed.

		Available context:
		${contextInfo}

		When using tools, ensure the input is correctly formatted as JSON. If a tool returns an error or no result, inform the user appropriately.

		When using web search, you can autonomously search for current information, recent events, or data beyond your knowledge cutoff. Search results will include citations.

		When using web fetch, you can retrieve full text content from URLs (including PDFs). Use URLs from user messages or previous tool results - you cannot generate URLs yourself.
		`;
	return systemPrompt;
}

function stopReason(reason: Anthropic.Messages.StopReason | null): string {
	switch (reason) {
		case "max_tokens":
			return "Max tokens reached.";
		case "stop_sequence":
			return "Custom stop sequence encountered.";
		case "tool_use":
			return "Tool use initiated.";
		case "end_turn":
			return "Reached natural stopping point.";
		case "model_context_window_exceeded":
			return "Model context window exceeded.";
		case "pause_turn":
			return "Paused long-running turn.";
		case "refusal":
			return "Refusal to respond.";
		default:
			return "Unknown stop reason.";
	}
}

async function processToolCall(
	toolUse: Anthropic.Messages.ToolUseBlock,
	output: OutputHandler,
): Promise<Anthropic.ToolResultBlockParam | null> {
	const tool = tools.find((t) => t.tool.name === toolUse.name);
	if (!tool) {
		output.showError(`Unknown tool: ${toolUse.name}`);
		return {
			type: "tool_result",
			tool_use_id: toolUse.id,
			content: `Error: Unknown tool ${toolUse.name}`,
			is_error: true,
		};
	}

	// Check if this is a RunnableTool with local execution
	if (!isRunnableTool(tool)) {
		// This is a PlainTool (API-executed like web_search)
		// The API handles execution and returns results automatically
		// No local processing needed
		return null;
	}

	// Execute RunnableTool locally
	try {
		const input = tool.input.parse(toolUse.input);
		const result = await tool.run(input as any);
		return {
			type: "tool_result",
			tool_use_id: toolUse.id,
			content: result ? JSON.stringify(result) : "Error: No result returned",
			is_error: !result,
		};
	} catch (error) {
		output.showError(`Invalid input: ${JSON.stringify(error)}`);
		return {
			type: "tool_result",
			tool_use_id: toolUse.id,
			content: `Error: Invalid input - ${JSON.stringify(error)}`,
			is_error: true,
		};
	}
}

async function sendMessage(
	system: string,
	context: Anthropic.Messages.MessageParam[],
	output: OutputHandler | JsonOutputHandler,
): Promise<Anthropic.Messages.MessageParam[]> {
	const messages: Anthropic.Messages.MessageParam[] = [];
	const isJsonOutput = output instanceof JsonOutputHandler;

	output.startThinking();

	// Call the Anthropic API
	const msg = await anthropic.messages.create({
		model,
		tools: tools.map((t) => t.tool),
		system,
		max_tokens: maxTokens,
		messages: [...context],
	});
	messages.push({ role: "assistant", content: msg.content });
	output.stopThinking(stopReason(msg.stop_reason));

	// Add assistant message to JSON output
	if (isJsonOutput) {
		output.addAssistantMessage(msg.content);
		// Track usage if available
		if (msg.usage) {
			output.setUsage(msg.usage.input_tokens, msg.usage.output_tokens);
		}
	}

	// Process the response
	const toolResults: Anthropic.ToolResultBlockParam[] = [];

	for (const block of msg.content) {
		if (block.type === "text") {
			output.showMessage(block.text);
		} else if (block.type === "tool_use") {
			output.startTool(block.name);

			// Track tool input for JSON output
			if (isJsonOutput) {
				output.addToolCallInput(block.name, block.input);
			}

			const result = await processToolCall(block, output);
			// Only collect results for locally-executed tools
			// API-executed tools (like web_search) return null and are handled by the API
			if (result !== null) {
				const success = !result.is_error;
				output.stopTool(block.name, success, success ? "Success" : "Failed");

				// Track tool result for JSON output
				if (isJsonOutput) {
					output.addToolCallResult(block.name, result.content, success);
				}

				toolResults.push(result);
			} else {
				output.stopTool(block.name, true, "Executed by API");

				// Track API-executed tool for JSON output
				if (isJsonOutput) {
					output.addToolCallResult(block.name, "Executed by API", true);
				}
			}
		}
	}

	if (toolResults.length > 0) {
		messages.push({
			role: "user",
			content: toolResults,
		});
	}

	if (msg.stop_reason === "tool_use") {
		const newMessages = await sendMessage(
			system,
			[...context, ...messages],
			output,
		);
		messages.push(...newMessages);
	}

	return messages;
}

async function runInteractiveMode(systemPrompt: string): Promise<void> {
	const messages: Anthropic.Messages.MessageParam[] = [];
	const output = new TextOutputHandlerWithVisibility();

	let value = await text({
		message: "How can I help you?",
	});

	while (!isCancel(value)) {
		messages.push({ role: "user", content: value });

		// Send the message to the model and get a final response
		const newMessages = await sendMessage(systemPrompt, messages, output);
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
): Promise<void> {
	const messages: Anthropic.Messages.MessageParam[] = [];
	const output = createOutputHandler(format, verbose, model);

	messages.push({ role: "user", content: message });

	// Track user message for JSON output
	if (output instanceof JsonOutputHandler) {
		output.addUserMessage(message);
	}

	// Send the message to the model and get a final response
	const newMessages = await sendMessage(systemPrompt, messages, output);
	messages.push(...newMessages);

	// Output JSON if that format was requested
	if (output instanceof JsonOutputHandler) {
		output.output();
	}
}

async function main() {
	const systemPrompt = loadContext(contextFile);

	// Parse command-line arguments (skip first two: node and script path)
	const args = process.argv.slice(2);

	try {
		const parsed = parseArgs(args);

		if (parsed.help) {
			showHelp();
			process.exit(0);
		}

		if (parsed.message) {
			// Non-interactive mode
			await runNonInteractiveMode(
				systemPrompt,
				parsed.message,
				parsed.format,
				parsed.verbose,
			);
		} else {
			// Interactive mode
			await runInteractiveMode(systemPrompt);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
			showHelp();
			process.exit(1);
		}
		throw error;
	}
}

main();
