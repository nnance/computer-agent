import { describe, it, expect } from "vitest";

/**
 * Example test suite to verify Vitest setup
 * This demonstrates basic test patterns for the computer-agent project
 */

describe("Vitest Setup", () => {
	it("should run basic assertions", () => {
		expect(true).toBe(true);
		expect(1 + 1).toBe(2);
	});

	it("should handle string operations", () => {
		const message = "Hello, Vitest!";
		expect(message).toContain("Vitest");
		expect(message.toLowerCase()).toBe("hello, vitest!");
	});

	it("should work with arrays", () => {
		const tools = ["notes", "calendar", "contacts"];
		expect(tools).toHaveLength(3);
		expect(tools).toContain("notes");
	});

	it("should handle async operations", async () => {
		const promise = Promise.resolve("success");
		await expect(promise).resolves.toBe("success");
	});

	it("should handle objects", () => {
		const toolConfig = {
			name: "test_tool",
			description: "A test tool",
			version: "1.0.0",
		};

		expect(toolConfig).toHaveProperty("name");
		expect(toolConfig.name).toBe("test_tool");
		expect(toolConfig).toMatchObject({
			name: "test_tool",
			description: expect.any(String),
		});
	});
});

describe("Type Safety Tests", () => {
	it("should infer correct types", async () => {
		interface Tool {
			name: string;
			run: () => Promise<string>;
		}

		const mockTool: Tool = {
			name: "mock",
			run: async () => "result",
		};

		expect(mockTool.name).toBe("mock");
		await expect(mockTool.run()).resolves.toBe("result");
	});
});
