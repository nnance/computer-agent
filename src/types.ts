import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

/**
 * Plain tool definition for API-executed tools (e.g., web_search).
 * These tools are executed by Claude's API and don't require local run() implementation.
 */
export interface PlainTool {
	tool: Anthropic.Tool | Anthropic.Messages.ToolUnion;
}

/**
 * Tool with local execution logic (e.g., AppleScript tools, text editor, bash).
 * These tools have input validation and run() method for local execution.
 */
export interface RunnableTool<T, U> {
	tool: Anthropic.Tool | Anthropic.Messages.ToolUnion;
	input: z.Schema<T>;
	run: (input: T) => Promise<U>;
}

/**
 * Union type for all supported tool types.
 * Allows tools array to contain both API-executed and locally-executed tools.
 */
export type Tool = PlainTool | RunnableTool<any, any>;

/**
 * Type guard to check if a tool is a RunnableTool with local execution.
 */
export function isRunnableTool(tool: Tool): tool is RunnableTool<any, any> {
	return "run" in tool && "input" in tool;
}
