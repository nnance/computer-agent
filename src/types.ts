import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export interface RunnableTool<T, U> {
	tool: Anthropic.Tool | Anthropic.Messages.ToolUnion;
	input: z.Schema<T>;
	run: (input: T) => Promise<U>;
}
