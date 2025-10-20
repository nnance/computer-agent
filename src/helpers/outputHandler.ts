import type Anthropic from "@anthropic-ai/sdk";
import { log, spinner } from "@clack/prompts";

/**
 * Output interface for different modes (interactive vs non-interactive)
 */
export interface OutputHandler {
	startThinking: () => void;
	stopThinking: (message: string) => void;
	startTool: (toolName: string) => void;
	stopTool: (toolName: string, success: boolean, message: string) => void;
	showMessage: (message: string) => void;
	showSuccess: (message: string) => void;
	showError: (message: string) => void;
	showDebug: (message: string, level?: "info" | "warn" | "error") => void;
	showHelp: (helpText: string) => void;
}

/**
 * JSON output data structure
 */
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

/**
 * Extended output handler for JSON format with additional methods
 */
export interface JsonOutputHandler extends OutputHandler {
	addUserMessage: (content: string) => void;
	addAssistantMessage: (content: Anthropic.Messages.ContentBlock[]) => void;
	addToolCallInput: (toolName: string, input: unknown) => void;
	addToolCallResult: (
		toolName: string,
		result: unknown,
		success: boolean,
	) => void;
	setUsage: (inputTokens: number, outputTokens: number) => void;
	getData: () => JsonOutputData;
	output: () => void;
}

/**
 * Type guard to check if an output handler is a JsonOutputHandler
 */
export function isJsonOutputHandler(
	output: OutputHandler | JsonOutputHandler,
): output is JsonOutputHandler {
	return (
		"addUserMessage" in output &&
		"addAssistantMessage" in output &&
		"getData" in output &&
		"output" in output
	);
}

/**
 * Creates an interactive output handler using @clack/prompts
 * Includes spinners and formatted output for better UX
 */
export function createInteractiveOutput(debug: boolean = false): OutputHandler {
	const indicator = spinner();

	return {
		startThinking: () => indicator.start("Thinking..."),
		stopThinking: (message: string) => indicator.stop(message),
		startTool: (toolName: string) => indicator.start(`Using tool: ${toolName}`),
		stopTool: (toolName: string, _success: boolean, message: string) =>
			indicator.stop(`Tool ${toolName}: ${message}`),
		showMessage: (message: string) => log.message(message),
		showSuccess: (message: string) => log.success(message),
		showError: (message: string) => log.error(message),
		showDebug: (message: string, level: "info" | "warn" | "error" = "info") => {
			if (debug) {
				if (level === "warn") {
					log.warn(message);
				} else if (level === "error") {
					log.error(message);
				} else {
					log.info(message);
				}
			}
		},
		showHelp: (helpText: string) => {
			log.message(helpText);
		},
	};
}

/**
 * Creates a non-interactive output handler using plain console output
 * No spinners or special formatting - suitable for scripting and automation
 */
export function createNonInteractiveOutput(
	debug: boolean = false,
): OutputHandler {
	const indicator = spinner();

	return {
		startThinking: () => indicator.start("Thinking..."),
		stopThinking: (message: string) => indicator.stop(message),
		startTool: (toolName: string) => indicator.start(`Using tool: ${toolName}`),
		stopTool: (toolName: string, _success: boolean, message: string) =>
			indicator.stop(`Tool ${toolName}: ${message}`),
		showMessage: (message: string) => log.message(message),
		showSuccess: (message: string) => log.success(message),
		showError: (message: string) => log.error(message),
		showDebug: (message: string, level: "info" | "warn" | "error" = "info") => {
			if (debug) {
				if (level === "warn") {
					log.warn(message);
				} else if (level === "error") {
					log.error(message);
				} else {
					log.info(message);
				}
			}
		},
		showHelp: (helpText: string) => {
			process.stdout.write(`${helpText}\n`);
		},
	};
}

/**
 * Creates a JSON output handler that collects all data for structured output
 * Uses functional programming style with closures to maintain state
 */
export function createJsonOutput(
	model: string,
	debug: boolean = false,
): JsonOutputHandler {
	// Internal state managed via closures
	const data: JsonOutputData = {
		messages: [],
		toolCalls: [],
		stopReason: null,
		model,
	};

	let currentToolCall: {
		name: string;
		input: unknown;
		timestamp: string;
	} | null = null;

	return {
		// OutputHandler interface methods
		startThinking: () => {
			// No visual output, just tracking
		},

		stopThinking: (message: string) => {
			data.stopReason = message;
		},

		startTool: (toolName: string) => {
			// Store the tool call start for later completion
			currentToolCall = {
				name: toolName,
				input: {},
				timestamp: new Date().toISOString(),
			};
		},

		stopTool: (toolName: string, success: boolean, message: string) => {
			if (currentToolCall && currentToolCall.name === toolName) {
				data.toolCalls.push({
					name: toolName,
					input: currentToolCall.input,
					result: { message },
					success,
					timestamp: currentToolCall.timestamp,
				});
				currentToolCall = null;
			}
		},

		showMessage: (_message: string) => {
			// Messages are added via addAssistantMessage
		},

		showSuccess: (_message: string) => {
			// Success messages are part of tool results
		},

		showError: (_message: string) => {
			// Error messages are part of tool results or assistant messages
		},

		showDebug: (message: string, level?: "info" | "warn" | "error") => {
			if (debug) {
				const color =
					level === "error"
						? "\x1b[31m"
						: level === "warn"
							? "\x1b[33m"
							: "\x1b[90m";
				const reset = "\x1b[0m";
				process.stderr.write(`${color}[DEBUG]${reset} ${message}\n`);
			}
		},

		showHelp: (_helpText: string) => {
			// Silent in JSON mode - help text not needed
		},

		// JSON-specific methods
		addUserMessage: (content: string) => {
			data.messages.push({
				role: "user",
				content: [{ type: "text", text: content, citations: [] }],
				timestamp: new Date().toISOString(),
			});
		},

		addAssistantMessage: (content: Anthropic.Messages.ContentBlock[]) => {
			data.messages.push({
				role: "assistant",
				content,
				timestamp: new Date().toISOString(),
			});
		},

		addToolCallInput: (toolName: string, input: unknown) => {
			if (currentToolCall && currentToolCall.name === toolName) {
				currentToolCall.input = input;
			}
		},

		addToolCallResult: (
			toolName: string,
			result: unknown,
			success: boolean,
		) => {
			// Find the most recent tool call with this name
			const toolCall = data.toolCalls.findLast((tc) => tc.name === toolName);
			if (toolCall) {
				toolCall.result = result;
				toolCall.success = success;
			}
		},

		setUsage: (inputTokens: number, outputTokens: number) => {
			data.usage = { inputTokens, outputTokens };
		},

		getData: () => data,

		output: () => {
			console.log(JSON.stringify(data, null, 2));
		},
	};
}

// Factory function to create the appropriate output handler
export function createOutputHandler(
	format: "json" | "text",
	verbose: boolean,
	debug: boolean,
	model: string,
): OutputHandler | JsonOutputHandler {
	if (format === "json") {
		return createJsonOutput(model, debug);
	}

	if (verbose) {
		return createInteractiveOutput(debug);
	}

	return createNonInteractiveOutput(debug);
}
