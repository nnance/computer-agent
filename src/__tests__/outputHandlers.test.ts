import { describe, expect, it } from "vitest";
import {
	createInteractiveOutput,
	createJsonOutput,
	createNonInteractiveOutput,
	createOutputHandler,
	isJsonOutputHandler,
} from "../helpers/outputHandler.js";

describe("createJsonOutput", () => {
	it("should initialize with empty data", () => {
		const handler = createJsonOutput("test-model");
		const data = handler.getData();

		expect(data.messages).toEqual([]);
		expect(data.toolCalls).toEqual([]);
		expect(data.stopReason).toBeNull();
		expect(data.model).toBe("test-model");
	});

	it("should add user message", () => {
		const handler = createJsonOutput("test-model");
		handler.addUserMessage("Hello");

		const data = handler.getData();
		expect(data.messages).toHaveLength(1);
		expect(data.messages[0]?.role).toBe("user");
		expect(data.messages[0]?.content).toHaveLength(1);
		expect(data.messages[0]?.content[0]?.type).toBe("text");
		if (data.messages[0]?.content[0]?.type === "text") {
			expect(data.messages[0].content[0].text).toBe("Hello");
		}
	});

	it("should add assistant message", () => {
		const handler = createJsonOutput("test-model");
		const content = [
			{ type: "text" as const, text: "Hi there", citations: [] },
		];
		handler.addAssistantMessage(content);

		const data = handler.getData();
		expect(data.messages).toHaveLength(1);
		expect(data.messages[0]?.role).toBe("assistant");
		expect(data.messages[0]?.content).toEqual(content);
	});

	it("should track tool calls", () => {
		const handler = createJsonOutput("test-model");

		handler.startTool("test_tool");
		handler.addToolCallInput("test_tool", { param: "value" });
		handler.stopTool("test_tool", true, "Success");

		const data = handler.getData();
		expect(data.toolCalls).toHaveLength(1);
		expect(data.toolCalls[0]?.name).toBe("test_tool");
		expect(data.toolCalls[0]?.input).toEqual({ param: "value" });
		expect(data.toolCalls[0]?.success).toBe(true);
	});

	it("should track usage stats", () => {
		const handler = createJsonOutput("test-model");
		handler.setUsage(100, 50);

		const data = handler.getData();
		expect(data.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
	});

	it("should track stop reason", () => {
		const handler = createJsonOutput("test-model");
		handler.stopThinking("Max tokens reached");

		const data = handler.getData();
		expect(data.stopReason).toBe("Max tokens reached");
	});
});

describe("createNonInteractiveOutput", () => {
	it("should not throw errors when methods are called", () => {
		const handler = createNonInteractiveOutput();

		expect(() => handler.startThinking()).not.toThrow();
		expect(() => handler.stopThinking("test")).not.toThrow();
		expect(() => handler.startTool("test")).not.toThrow();
		expect(() => handler.stopTool("test", true, "success")).not.toThrow();
	});
});

describe("createInteractiveOutput", () => {
	it("should not throw errors when methods are called", () => {
		const handler = createInteractiveOutput();

		expect(() => handler.startThinking()).not.toThrow();
		expect(() => handler.stopThinking("test")).not.toThrow();
		expect(() => handler.startTool("test")).not.toThrow();
		expect(() => handler.stopTool("test", true, "success")).not.toThrow();
	});
});

describe("createOutputHandler", () => {
	it("should create JsonOutputHandler for json format", () => {
		const handler = createOutputHandler("json", false, "test-model");
		expect(isJsonOutputHandler(handler)).toBe(true);
	});

	it("should create interactive output handler for text format with verbose", () => {
		const handler = createOutputHandler("text", true, "test-model");
		expect(handler).toBeDefined();
		expect(handler.startThinking).toBeInstanceOf(Function);
		expect(handler.showMessage).toBeInstanceOf(Function);
	});

	it("should create non-interactive output handler for text format without verbose", () => {
		const handler = createOutputHandler("text", false, "test-model");
		expect(handler).toBeDefined();
		expect(handler.startThinking).toBeInstanceOf(Function);
		expect(handler.showMessage).toBeInstanceOf(Function);
	});
});
