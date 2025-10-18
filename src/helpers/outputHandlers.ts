import type Anthropic from "@anthropic-ai/sdk";
import { log, spinner } from "@clack/prompts";

// Output interface for different modes
export interface OutputHandler {
	startThinking: () => void;
	stopThinking: (message: string) => void;
	startTool: (toolName: string) => void;
	stopTool: (toolName: string, success: boolean, message: string) => void;
	showMessage: (message: string) => void;
	showSuccess: (message: string) => void;
	showError: (message: string) => void;
}

// JSON output handler - collects all data for structured output
export interface JsonOutputData {
	messages: Array<{
		role: "user" | "assistant";
		content: Anthropic.Messages.ContentBlock[];
		timestamp: string;
	}>;
	toolCalls: Array<{
		name: string;
		input: unknown;
		result: unknown;
		success: boolean;
		timestamp: string;
	}>;
	stopReason: string | null;
	model: string;
	usage?: {
		inputTokens: number;
		outputTokens: number;
	};
}

export class JsonOutputHandler implements OutputHandler {
	private data: JsonOutputData;
	private currentToolCall: {
		name: string;
		input: unknown;
		timestamp: string;
	} | null = null;

	constructor(model: string) {
		this.data = {
			messages: [],
			toolCalls: [],
			stopReason: null,
			model,
		};
	}

	startThinking(): void {
		// No visual output, just tracking
	}

	stopThinking(message: string): void {
		this.data.stopReason = message;
	}

	startTool(toolName: string): void {
		// Store the tool call start for later completion
		this.currentToolCall = {
			name: toolName,
			input: {},
			timestamp: new Date().toISOString(),
		};
	}

	stopTool(toolName: string, success: boolean, message: string): void {
		if (this.currentToolCall && this.currentToolCall.name === toolName) {
			this.data.toolCalls.push({
				name: toolName,
				input: this.currentToolCall.input,
				result: { message },
				success,
				timestamp: this.currentToolCall.timestamp,
			});
			this.currentToolCall = null;
		}
	}

	showMessage(message: string): void {
		// Messages are added via addAssistantMessage
	}

	showSuccess(message: string): void {
		// Success messages are part of tool results
	}

	showError(message: string): void {
		// Error messages are part of tool results or assistant messages
	}

	// Additional methods for JSON handler
	addUserMessage(content: string): void {
		this.data.messages.push({
			role: "user",
			content: [{ type: "text", text: content, citations: [] }],
			timestamp: new Date().toISOString(),
		});
	}

	addAssistantMessage(content: Anthropic.Messages.ContentBlock[]): void {
		this.data.messages.push({
			role: "assistant",
			content,
			timestamp: new Date().toISOString(),
		});
	}

	addToolCallInput(toolName: string, input: unknown): void {
		if (this.currentToolCall && this.currentToolCall.name === toolName) {
			this.currentToolCall.input = input;
		}
	}

	addToolCallResult(toolName: string, result: unknown, success: boolean): void {
		// Find the most recent tool call with this name
		const toolCall = this.data.toolCalls.findLast((tc) => tc.name === toolName);
		if (toolCall) {
			toolCall.result = result;
			toolCall.success = success;
		}
	}

	setUsage(inputTokens: number, outputTokens: number): void {
		this.data.usage = { inputTokens, outputTokens };
	}

	getData(): JsonOutputData {
		return this.data;
	}

	output(): void {
		console.log(JSON.stringify(this.data, null, 2));
	}
}

// Text output handler with visibility (uses clack/prompts)
export class TextOutputHandlerWithVisibility implements OutputHandler {
	private indicator = spinner();

	startThinking(): void {
		this.indicator.start("Thinking...");
	}

	stopThinking(message: string): void {
		this.indicator.stop(message);
	}

	startTool(toolName: string): void {
		this.indicator.start(`Using tool: ${toolName}`);
	}

	stopTool(toolName: string, success: boolean, message: string): void {
		this.indicator.stop(`Tool ${toolName}: ${message}`);
	}

	showMessage(message: string): void {
		log.message(message);
	}

	showSuccess(message: string): void {
		log.success(message);
	}

	showError(message: string): void {
		log.error(message);
	}
}

// Text output handler without visibility (minimal output)
export class TextOutputHandlerQuiet implements OutputHandler {
	startThinking(): void {
		// No output
	}

	stopThinking(_message: string): void {
		// No output
	}

	startTool(_toolName: string): void {
		// No output
	}

	stopTool(_toolName: string, _success: boolean, _message: string): void {
		// No output
	}

	showMessage(message: string): void {
		console.log(message);
	}

	showSuccess(message: string): void {
		console.log(message);
	}

	showError(message: string): void {
		console.error(message);
	}
}

// Factory function to create the appropriate output handler
export function createOutputHandler(
	format: "json" | "text",
	verbose: boolean,
	model: string,
): OutputHandler | JsonOutputHandler {
	if (format === "json") {
		return new JsonOutputHandler(model);
	}

	if (verbose) {
		return new TextOutputHandlerWithVisibility();
	}

	return new TextOutputHandlerQuiet();
}
