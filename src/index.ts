import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, log, spinner, text } from "@clack/prompts";
import { appleCalendarTools } from "./appleCalendarTool.js";
import { appleContactsTools } from "./appleContactsTool.js";
import { appleNotesTools } from "./appleNotesTool.js";
import { bashTool } from "./bashTool.js";
import { handleView, textEditorTool } from "./textEditorTool.js";

const tools = [
	...appleNotesTools,
	...appleCalendarTools,
	...appleContactsTools,
	textEditorTool,
	bashTool,
];
const contextFile = "./tmp/ASSISTANT.md";
const anthropic = new Anthropic();
const indicator = spinner();

function loadContext(filePath: string): string {
	const contextInfo = handleView(filePath)?.content || "No context available";

	log.info(`Loaded context: ${contextInfo.length} characters.`);

	const systemPrompt = `
		You are a helpful assistant that can use tools to interact with the user's Apple Notes, Calendar, Contacts, local text files, and execute bash commands. Use the provided tools to fulfill user requests as needed.

		Available context:
		${contextInfo}

		When using tools, ensure the input is correctly formatted as JSON. If a tool returns an error or no result, inform the user appropriately.
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
): Promise<Anthropic.ToolResultBlockParam> {
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
		model: "claude-sonnet-4-5",
		tools: tools.map((t) => t.tool),
		system,
		max_tokens: 1024,
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
			indicator.stop(`Tool ${block.name}: ${result ? "Success" : "Failed"}.`);
			toolResults.push(result);
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
