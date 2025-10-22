import { log } from "@clack/prompts";
import { describe, expect, it, vi } from "vitest";
import {
	createInteractiveOutput,
	createJsonOutput,
	createNonInteractiveOutput,
	type OutputHandler,
} from "../../helpers/outputHandler.js";

// TODO: fix the failing tests
describe("outputHandler", () => {
	describe("createInteractiveOutput", () => {
		it("should create an interactive output handler with all methods", () => {
			const output = createInteractiveOutput();

			expect(output).toBeDefined();
			expect(output.startThinking).toBeInstanceOf(Function);
			expect(output.stopThinking).toBeInstanceOf(Function);
			expect(output.startTool).toBeInstanceOf(Function);
			expect(output.stopTool).toBeInstanceOf(Function);
			expect(output.showMessage).toBeInstanceOf(Function);
			expect(output.showSuccess).toBeInstanceOf(Function);
			expect(output.showError).toBeInstanceOf(Function);
		});

		it("should implement OutputHandler interface", () => {
			const output: OutputHandler = createInteractiveOutput();

			// Should not throw when calling any method
			expect(() => output.startThinking()).not.toThrow();
			expect(() => output.stopThinking("test")).not.toThrow();
			expect(() => output.startTool("test")).not.toThrow();
			expect(() => output.stopTool("test", true, "success")).not.toThrow();
			expect(() => output.showMessage("test")).not.toThrow();
			expect(() => output.showSuccess("test")).not.toThrow();
			expect(() => output.showError("test")).not.toThrow();
		});
	});

	describe("createNonInteractiveOutput", () => {
		it("should create a non-interactive output handler with all methods", () => {
			const output = createNonInteractiveOutput();

			expect(output).toBeDefined();
			expect(output.startThinking).toBeInstanceOf(Function);
			expect(output.stopThinking).toBeInstanceOf(Function);
			expect(output.startTool).toBeInstanceOf(Function);
			expect(output.stopTool).toBeInstanceOf(Function);
			expect(output.showMessage).toBeInstanceOf(Function);
			expect(output.showSuccess).toBeInstanceOf(Function);
			expect(output.showError).toBeInstanceOf(Function);
		});

		it("should implement OutputHandler interface", () => {
			const output: OutputHandler = createNonInteractiveOutput();

			// Should not throw when calling any method
			expect(() => output.startThinking()).not.toThrow();
			expect(() => output.stopThinking("test")).not.toThrow();
			expect(() => output.startTool("test")).not.toThrow();
			expect(() => output.stopTool("test", true, "success")).not.toThrow();
		});

		it("should call log.message for showMessage", () => {
			const logSpy = vi.spyOn(log, "message").mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.showMessage("test message");

			expect(logSpy).toHaveBeenCalledWith("test message");
			logSpy.mockRestore();
		});

		it("should call log.success for showSuccess", () => {
			const logSpy = vi.spyOn(log, "success").mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.showSuccess("success message");

			expect(logSpy).toHaveBeenCalledWith("success message");
			logSpy.mockRestore();
		});

		it("should call log.error for showError", () => {
			const logSpy = vi.spyOn(log, "error").mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.showError("error message");

			expect(logSpy).toHaveBeenCalledWith("error message");
			logSpy.mockRestore();
		});

		it("should not output anything for thinking and tool methods", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.startThinking();
			output.stopThinking("test");
			output.startTool("test");
			output.stopTool("test", true, "success");

			expect(consoleSpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
			consoleErrorSpy.mockRestore();
		});
	});

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
});
