import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, log, spinner, text } from "@clack/prompts";
import { appleCalendarTools } from "./tools/appleCalendarTool.js";
import { appleContactsTools } from "./tools/appleContactsTool.js";
import { appleNotesTools } from "./tools/appleNotesTool.js";
import { bashTool } from "./tools/bashTool.js";
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
const indicator = spinner();

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
): Promise<Anthropic.ToolResultBlockParam | null> {
	const tool = tools.find((t) => t.tool.name === toolUse.name);
	if (!tool) {
		log.error(`Unknown tool: ${toolUse.name}`);
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
		log.error(`Invalid input: ${JSON.stringify(error)}`);
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
) {
	const messages: Anthropic.Messages.MessageParam[] = [];
	indicator.start("Thinking...");

	// Call the Anthropic API
	const msg = await anthropic.messages.create({
		model,
		tools: tools.map((t) => t.tool),
		system,
		max_tokens: maxTokens,
		messages: [...context],
	});
	messages.push({ role: "assistant", content: msg.content });
	indicator.stop(stopReason(msg.stop_reason));

	// Process the response
	const toolResults: Anthropic.ToolResultBlockParam[] = [];

	for (const block of msg.content) {
		if (block.type === "text") {
			log.message(block.text);
		} else if (block.type === "tool_use") {
			indicator.start(`Using tool: ${block.name}`);
			const result = await processToolCall(block);
			// Only collect results for locally-executed tools
			// API-executed tools (like web_search) return null and are handled by the API
			if (result !== null) {
				indicator.stop(
					`Tool ${block.name}: ${!result.is_error ? "Success" : "Failed"}.`,
				);
				toolResults.push(result);
			} else {
				indicator.stop(`Tool ${block.name}: Executed by API`);
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
		const newMessages = await sendMessage(system, [...context, ...messages]);
		messages.push(...newMessages);
	}

	return messages;
}

async function main() {
	const messages: Anthropic.Messages.MessageParam[] = [];

	const systemPrompt = loadContext(contextFile);

	let value = await text({
		message: "How can I help you?",
	});

	while (!isCancel(value)) {
		messages.push({ role: "user", content: value });

		// Send the message to the model and get a final response
		const newMessages = await sendMessage(systemPrompt, messages);
		messages.push(...newMessages);

		// Prompt for the next input
		value = await text({
			message: "How can I help you?",
		});
	}

	log.success("Goodbye!");
}

main();
