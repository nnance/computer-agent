import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, cancel, text, log, spinner } from "@clack/prompts";
import { appleNotesTools } from "./appleNotesTool.js";

const tools = [...appleNotesTools];
const anthropic = new Anthropic();
const indicator = spinner();

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

async function sendMessage(context: Anthropic.Messages.MessageParam[]) {
	const messages: Anthropic.Messages.MessageParam[] = [];
	indicator.start("Thinking...");

	// Call the Anthropic API
	const msg = await anthropic.messages.create({
		model: "claude-sonnet-4-5",
		tools: tools.map((t) => t.tool),
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
		const newMessages = await sendMessage([...context, ...messages]);
		messages.push(...newMessages);
	}

	return messages;
}

async function main() {
	let value = await text({
		message: "How can I help you?",
	});

	const messages: Anthropic.Messages.MessageParam[] = [];

	while (!isCancel(value)) {
		if (isCancel(value)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		messages.push({ role: "user", content: value });

		const newMessages = await sendMessage(messages);
		messages.push(...newMessages);

		// Prompt for the next input
		value = await text({
			message: "How can I help you?",
		});
	}

	log.success("Goodbye!");
}

main();
