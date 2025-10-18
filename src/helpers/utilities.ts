import type Anthropic from "@anthropic-ai/sdk";
import { log } from "@clack/prompts";
import { handleView } from "../tools/textEditorTool.js";

/**
 * Loads context from a file and generates the system prompt
 * @param filePath Path to the context file
 * @returns System prompt string with context information
 */
export function loadContext(filePath: string): string {
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

/**
 * Converts Claude's stop reason enum to a human-readable string
 * @param reason The stop reason from Claude API
 * @returns Human-readable description of the stop reason
 */
export function stopReason(reason: Anthropic.Messages.StopReason | null): string {
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
