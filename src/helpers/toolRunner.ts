import type Anthropic from "@anthropic-ai/sdk";
import { isRunnableTool, type Tool } from "../tools/types.js";
import type { OutputHandler } from "./outputHandler.js";

/**
 * Processes a single tool call from Claude
 * For RunnableTools: validates input and executes locally
 * For PlainTools: returns null (API handles execution)
 */
export async function processToolCall(
	toolUse: Anthropic.Messages.ToolUseBlock,
	tools: Tool[],
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

/**
 * Sends a message to Claude and handles the full agentic loop
 * - Calls the Anthropic API
 * - Processes tool calls
 * - Recursively continues if more tool calls are needed
 * Returns all messages in the conversation turn
 */
export async function sendMessage(
	anthropic: Anthropic,
	model: string,
	maxTokens: number,
	tools: Tool[],
	system: string,
	context: Anthropic.Messages.MessageParam[],
	output: OutputHandler,
	stopReasonFormatter: (reason: Anthropic.Messages.StopReason | null) => string,
): Promise<Anthropic.Messages.MessageParam[]> {
	const messages: Anthropic.Messages.MessageParam[] = [];
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
	output.stopThinking(stopReasonFormatter(msg.stop_reason));

	// Process the response
	const toolResults: Anthropic.ToolResultBlockParam[] = [];

	for (const block of msg.content) {
		if (block.type === "text") {
			output.showMessage(block.text);
		} else if (block.type === "tool_use") {
			output.startTool(block.name);
			const result = await processToolCall(block, tools, output);
			// Only collect results for locally-executed tools
			// API-executed tools (like web_search) return null and are handled by the API
			if (result !== null) {
				output.stopTool(
					block.name,
					!result.is_error,
					!result.is_error ? "Success" : "Failed",
				);
				toolResults.push(result);
			} else {
				output.stopTool(block.name, true, "Executed by API");
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
			anthropic,
			model,
			maxTokens,
			tools,
			system,
			[...context, ...messages],
			output,
			stopReasonFormatter,
		);
		messages.push(...newMessages);
	}

	return messages;
}
