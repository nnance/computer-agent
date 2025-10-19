import { z } from "zod";

/**
 * Converts a Zod schema to JSON Schema format compatible with Claude API.
 * Uses Zod's built-in toJSONSchema() for accurate conversions.
 *
 * @param zodSchema - The Zod schema to convert
 * @returns JSON Schema object for use in tool definitions
 */
export function zodToJsonSchema(
	zodSchema: z.ZodTypeAny,
): Record<string, any> {
	return z.toJSONSchema(zodSchema, {
		target: "draft-7", // Use Draft 7 for broad compatibility
	});
}

/**
 * Helper to extract required fields from a Zod object schema.
 * @param zodSchema - Object schema to analyze
 * @returns Array of required field names
 */
export function getRequiredFields(zodSchema: z.ZodObject<any>): string[] {
	const shape = zodSchema.shape;
	return Object.entries(shape)
		.filter(([_, schema]) => {
			const zodType = schema as z.ZodTypeAny;
			// Check if the schema is optional by looking for ZodOptional wrapper
			return !(zodType instanceof z.ZodOptional);
		})
		.map(([key]) => key);
}
