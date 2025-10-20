import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import type { OutputHandler } from "../helpers/outputHandler.js";
import { zodToJsonSchema } from "./schemaUtils.js";

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
	run: (input: T, output?: OutputHandler) => Promise<U>;
}

/**
 * Union type for all supported tool types.
 * Allows tools array to contain both API-executed and locally-executed tools.
 */
export type Tool = PlainTool | RunnableTool<unknown, unknown>;

/**
 * Type guard to check if a tool is a RunnableTool with local execution.
 */
export function isRunnableTool(tool: Tool): tool is RunnableTool<unknown, unknown> {
	return "run" in tool && "input" in tool;
}

/**
 * Creates a RunnableTool with automatic JSON Schema generation from Zod schema.
 * This eliminates the need to manually maintain both Zod and JSON schemas.
 *
 * @param config - Configuration object containing tool definition and implementation
 * @returns RunnableTool with generated input_schema
 *
 * @example
 * ```typescript
 * const MyInputSchema = z.object({
 *   name: z.string().describe("User's name"),
 *   age: z.number().optional().describe("User's age"),
 * });
 *
 * export const myTool = createRunnableTool({
 *   name: "my_tool",
 *   description: "Does something useful",
 *   schema: MyInputSchema,
 *   run: async (input) => {
 *     return `Hello, ${input.name}!`;
 *   },
 * });
 * ```
 */
export function createRunnableTool<T, U>(config: {
	name: string;
	description: string;
	schema: z.ZodSchema<T>;
	run: (input: T, output?: OutputHandler) => Promise<U>;
	type?: string;
}): RunnableTool<T, U> {
	const inputSchema = zodToJsonSchema(config.schema);

	return {
		tool: {
			...(config.type ? { type: config.type } : {}),
			name: config.name,
			description: config.description,
			input_schema: inputSchema,
		} as Anthropic.Tool | Anthropic.Messages.ToolUnion,
		input: config.schema as z.Schema<T>,
		run: config.run,
	};
}
