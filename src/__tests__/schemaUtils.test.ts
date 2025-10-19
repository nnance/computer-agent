import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	getRequiredFields,
	zodToJsonSchema,
} from "../tools/schemaUtils.js";

describe("schemaUtils", () => {
	describe("zodToJsonSchema", () => {
		it("should convert simple object schemas", () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema).toMatchObject({
				type: "object",
				properties: {
					name: { type: "string" },
					age: { type: "number" },
				},
				required: ["name", "age"],
				additionalProperties: false,
			});
		});

		it("should handle optional fields correctly", () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema).toMatchObject({
				type: "object",
				properties: {
					required: { type: "string" },
					optional: { type: "string" },
				},
				required: ["required"],
				additionalProperties: false,
			});
		});

		it("should preserve field descriptions", () => {
			const schema = z.object({
				email: z.string().describe("User email address"),
				age: z.number().describe("User age in years"),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema.properties.email).toMatchObject({
				type: "string",
				description: "User email address",
			});
			expect(jsonSchema.properties.age).toMatchObject({
				type: "number",
				description: "User age in years",
			});
		});

		it("should generate correct required array", () => {
			const schema = z.object({
				field1: z.string(),
				field2: z.string().optional(),
				field3: z.number(),
				field4: z.boolean().optional(),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema.required).toEqual(["field1", "field3"]);
		});

		it("should handle nested objects", () => {
			const schema = z.object({
				user: z.object({
					name: z.string(),
					email: z.string(),
				}),
				metadata: z.object({
					created: z.string(),
				}),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema).toMatchObject({
				type: "object",
				properties: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							email: { type: "string" },
						},
						required: ["name", "email"],
						additionalProperties: false,
					},
					metadata: {
						type: "object",
						properties: {
							created: { type: "string" },
						},
						required: ["created"],
						additionalProperties: false,
					},
				},
				required: ["user", "metadata"],
				additionalProperties: false,
			});
		});

		it("should handle enums", () => {
			const schema = z.object({
				status: z.enum(["pending", "active", "inactive"]),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema.properties.status).toMatchObject({
				type: "string",
				enum: ["pending", "active", "inactive"],
			});
		});

		it("should handle unions (string literal unions)", () => {
			const schema = z.object({
				mode: z.union([z.literal("light"), z.literal("dark")]),
			});

			const jsonSchema = zodToJsonSchema(schema);

			// Union of literals should be converted to anyOf structure
			expect(jsonSchema.properties.mode).toBeDefined();
			// Zod may convert this to anyOf structure with const values
			expect(jsonSchema.properties.mode.anyOf).toBeDefined();
		});

		it("should handle boolean types", () => {
			const schema = z.object({
				active: z.boolean(),
				verified: z.boolean().optional(),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema.properties.active).toMatchObject({
				type: "boolean",
			});
			expect(jsonSchema.properties.verified).toMatchObject({
				type: "boolean",
			});
		});

		it("should handle default values", () => {
			const schema = z.object({
				count: z.number().default(0),
				name: z.string().default("unnamed"),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema.properties.count).toMatchObject({
				type: "number",
				default: 0,
			});
			expect(jsonSchema.properties.name).toMatchObject({
				type: "string",
				default: "unnamed",
			});
		});

		it("should handle complex real-world schema (grep tool example)", () => {
			const schema = z.object({
				pattern: z.string().describe("The regular expression pattern"),
				path: z.string().optional().describe("File or directory to search"),
				output_mode: z
					.enum(["content", "files_with_matches", "count"])
					.optional()
					.default("files_with_matches")
					.describe("Output mode for results"),
				"-i": z.boolean().optional().describe("Case insensitive search"),
				"-n": z.boolean().optional().describe("Show line numbers"),
				multiline: z
					.boolean()
					.optional()
					.describe("Enable multiline mode"),
			});

			const jsonSchema = zodToJsonSchema(schema);

			expect(jsonSchema).toMatchObject({
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description: "The regular expression pattern",
					},
					path: {
						type: "string",
						description: "File or directory to search",
					},
					output_mode: {
						type: "string",
						enum: ["content", "files_with_matches", "count"],
						description: "Output mode for results",
						default: "files_with_matches",
					},
					"-i": {
						type: "boolean",
						description: "Case insensitive search",
					},
					"-n": {
						type: "boolean",
						description: "Show line numbers",
					},
					multiline: {
						type: "boolean",
						description: "Enable multiline mode",
					},
				},
				// Note: output_mode has .default() so it's included in required array
				required: ["pattern", "output_mode"],
				additionalProperties: false,
			});
		});

		it("should generate Draft 7 JSON Schema format", () => {
			const schema = z.object({
				test: z.string(),
			});

			const jsonSchema = zodToJsonSchema(schema);

			// Draft 7 uses specific keywords
			expect(jsonSchema).toHaveProperty("type");
			expect(jsonSchema).toHaveProperty("properties");
			// Zod's toJSONSchema should produce Draft 7 compatible output
			expect(jsonSchema.type).toBe("object");
		});
	});

	describe("getRequiredFields", () => {
		it("should extract required fields from object schema", () => {
			const schema = z.object({
				required1: z.string(),
				optional1: z.string().optional(),
				required2: z.number(),
				optional2: z.boolean().optional(),
			});

			const required = getRequiredFields(schema);

			expect(required).toEqual(["required1", "required2"]);
		});

		it("should return all fields when none are optional", () => {
			const schema = z.object({
				field1: z.string(),
				field2: z.number(),
				field3: z.boolean(),
			});

			const required = getRequiredFields(schema);

			expect(required).toEqual(["field1", "field2", "field3"]);
		});

		it("should return empty array when all fields are optional", () => {
			const schema = z.object({
				field1: z.string().optional(),
				field2: z.number().optional(),
			});

			const required = getRequiredFields(schema);

			expect(required).toEqual([]);
		});

		it("should handle fields with defaults", () => {
			const schema = z.object({
				required: z.string(),
				withDefault: z.number().default(0),
			});

			const required = getRequiredFields(schema);

			// Fields with defaults still appear in the shape but have default values
			// They're technically still in the schema as ZodDefault, not ZodOptional
			expect(required).toEqual(["required", "withDefault"]);
		});
	});
});
