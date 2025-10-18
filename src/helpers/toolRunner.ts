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
			content: result !== null && result !== undefined ? JSON.stringify(result) : "Error: No result returned",
			is_error: result === null || result === undefined,
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
	depth = 0,
	maxDepth = 10,
): Promise<Anthropic.Messages.MessageParam[]> {
	// Check recursion depth limit to prevent infinite loops
	if (depth >= maxDepth) {
		const errorMessage = `Maximum recursion depth (${maxDepth}) reached. This may indicate an infinite loop in tool calls.`;
		output.showError(errorMessage);
		throw new Error(errorMessage);
	}

	if (depth > 0) {
		output.showMessage(`Recursion depth: ${depth}/${maxDepth}`);
	}

	const messages: Anthropic.Messages.MessageParam[] = [];
	output.startThinking();

	// Call the Anthropic API with error handling and retry logic
	let msg: Anthropic.Messages.Message | undefined;
	const maxRetries = 3;
	const baseDelay = 1000; // 1 second base delay

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			msg = await anthropic.messages.create({
				model,
				tools: tools.map((t) => t.tool),
				system,
				max_tokens: maxTokens,
				messages: [...context],
			});
			break; // Success, exit retry loop
		} catch (error: unknown) {
			const toolsList = tools.map((t) => t.tool.name).join(", ");
			const toolsCount = tools.length;

			// Log error with context
			output.showError(
				`Anthropic API call failed (attempt ${attempt}/${maxRetries}): ` +
				`${error instanceof Error ? error.message : String(error)} ` +
				`[Model: ${model}, Tools: ${toolsList || 'none'}, System length: ${system.length}]`
			);

			// Check if this is the last attempt
			if (attempt === maxRetries) {
				const enhancedError = new Error(
					`Anthropic API call failed after ${maxRetries} attempts. ` +
					`Model: ${model}, Tools: ${toolsCount > 0 ? `${toolsCount} tools (${toolsList})` : 'none'}, ` +
					`System length: ${system.length}, Context messages: ${context.length}. ` +
					`Original error: ${error instanceof Error ? error.message : String(error)}`
				);
				enhancedError.cause = error;
				throw enhancedError;
			}

			// Exponential backoff with jitter for transient errors
			const isTransientError = error instanceof Error && (
				error.message.includes("rate_limit") ||
				error.message.includes("overloaded") ||
				error.message.includes("timeout") ||
				error.message.includes("503") ||
				error.message.includes("502") ||
				error.message.includes("500")
			);

			if (isTransientError) {
				const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
				output.showMessage(`Retrying in ${Math.round(delay)}ms due to transient error...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			} else {
				// For non-transient errors, wait a shorter time
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}
	}

	// Ensure msg is defined after successful retry loop
	if (!msg) {
		throw new Error("Failed to get response from Anthropic API after all retry attempts");
	}

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
			depth + 1,
			maxDepth,
		);
		messages.push(...newMessages);
	}

	return messages;
}
