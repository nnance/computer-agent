import { describe, expect, it } from "vitest";
import { webSearchTool } from "../tools/webSearchTool.js";

/**
 * Test suite for the web search tool
 * Tests PlainTool configuration with default/current environment variables
 *
 * Note: Since the tool is initialized at module load time, these tests verify
 * the tool structure and configuration based on the current environment.
 */

describe("Web Search Tool", () => {
	describe("Tool Definition", () => {
		it("should have correct tool type and name", () => {
			expect(webSearchTool.tool).toHaveProperty("type", "web_search_20250305");
			expect(webSearchTool.tool).toHaveProperty("name", "web_search");
		});

		it("should be a PlainTool without input or run methods", () => {
			expect(webSearchTool).not.toHaveProperty("input");
			expect(webSearchTool).not.toHaveProperty("run");
			expect(webSearchTool).toHaveProperty("tool");
		});

		it("should have a valid tool object structure", () => {
			expect(webSearchTool.tool).toBeDefined();
			expect(webSearchTool.tool.type).toBe("web_search_20250305");
			expect(webSearchTool.tool.name).toBe("web_search");
		});
	});

	describe("Tool Configuration Properties", () => {
		it("should only include defined configuration properties", () => {
			const tool = webSearchTool.tool as any;

			// All properties should be intentional
			const knownProps = [
				"type",
				"name",
				"max_uses",
				"allowed_domains",
				"blocked_domains",
				"user_location",
			];

			for (const key of Object.keys(tool)) {
				expect(knownProps).toContain(key);
			}
		});

		it("should have correct types for configured properties", () => {
			const tool = webSearchTool.tool as any;

			if (tool.max_uses !== undefined) {
				expect(typeof tool.max_uses).toBe("number");
				expect(tool.max_uses).toBeGreaterThan(0);
			}

			if (tool.allowed_domains !== undefined) {
				expect(Array.isArray(tool.allowed_domains)).toBe(true);
			}

			if (tool.blocked_domains !== undefined) {
				expect(Array.isArray(tool.blocked_domains)).toBe(true);
			}

			if (tool.user_location !== undefined) {
				expect(tool.user_location).toHaveProperty("type", "approximate");
			}
		});
	});

	describe("Configuration Validation", () => {
		it("should not have both allowed_domains and blocked_domains", () => {
			const tool = webSearchTool.tool as any;

			// Per Claude docs: Cannot use both simultaneously
			if (tool.allowed_domains !== undefined) {
				expect(tool.blocked_domains).toBeUndefined();
			}
			if (tool.blocked_domains !== undefined) {
				expect(tool.allowed_domains).toBeUndefined();
			}
		});

		it("should have valid domain format if domains are specified", () => {
			const tool = webSearchTool.tool as any;

			if (tool.allowed_domains !== undefined) {
				for (const domain of tool.allowed_domains) {
					expect(typeof domain).toBe("string");
					expect(domain.length).toBeGreaterThan(0);
					expect(domain.trim()).toBe(domain); // No whitespace
				}
			}

			if (tool.blocked_domains !== undefined) {
				for (const domain of tool.blocked_domains) {
					expect(typeof domain).toBe("string");
					expect(domain.length).toBeGreaterThan(0);
					expect(domain.trim()).toBe(domain); // No whitespace
				}
			}
		});

		it("should have valid user_location structure if specified", () => {
			const tool = webSearchTool.tool as any;

			if (tool.user_location !== undefined) {
				expect(tool.user_location.type).toBe("approximate");

				// At least one location field should be present
				const hasLocationField =
					tool.user_location.city !== undefined ||
					tool.user_location.region !== undefined ||
					tool.user_location.country !== undefined ||
					tool.user_location.timezone !== undefined;

				expect(hasLocationField).toBe(true);
			}
		});
	});
});

describe("Type Guard Tests", () => {
	it("should correctly identify PlainTool", async () => {
		const { isRunnableTool } = await import("../tools/types.js");
		const { webSearchTool } = await import("../tools/webSearchTool.js");

		expect(isRunnableTool(webSearchTool)).toBe(false);
	});

	it("should correctly identify RunnableTool", async () => {
		const { isRunnableTool } = await import("../tools/types.js");
		const mockRunnableTool = {
			tool: {
				name: "test",
				description: "Test tool",
				input_schema: {
					type: "object" as const,
					properties: {},
				},
			},
			input: {} as any,
			run: async () => "result",
		};

		expect(isRunnableTool(mockRunnableTool)).toBe(true);
	});
});
