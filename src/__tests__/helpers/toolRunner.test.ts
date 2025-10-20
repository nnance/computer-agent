import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { OutputHandler } from "../../helpers/outputHandler.js";
import { processToolCall, sendMessage } from "../../helpers/toolRunner.js";
import type { PlainTool, RunnableTool, Tool } from "../../tools/types.js";

describe("toolRunner", () => {
	describe("processToolCall", () => {
		it("should return error for unknown tool", async () => {
			const toolUse: Anthropic.Messages.ToolUseBlock = {
				type: "tool_use",
				id: "test-id",
				name: "unknown_tool",
				input: {},
			};

			const mockOutput: OutputHandler = {
				startThinking: vi.fn(),
				stopThinking: vi.fn(),
				startTool: vi.fn(),
				stopTool: vi.fn(),
				showMessage: vi.fn(),
				showSuccess: vi.fn(),
				showError: vi.fn(),
				showDebug: vi.fn(),
				showHelp: vi.fn(),
			};

			const result = await processToolCall(toolUse, [], mockOutput);

			expect(result).toEqual({
				type: "tool_result",
				tool_use_id: "test-id",
				content: "Error: Unknown tool unknown_tool",
				is_error: true,
			});
			expect(mockOutput.showError).toHaveBeenCalledWith(
				"Unknown tool: unknown_tool",
			);
		});

		it("should return null for PlainTool (API-executed)", async () => {
			const plainTool: PlainTool = {
				tool: {
					type: "web_search_20250305",
					name: "web_search",
				},
			};

			const toolUse: Anthropic.Messages.ToolUseBlock = {
				type: "tool_use",
				id: "test-id",
				name: "web_search",
				input: { query: "test" },
			};

			const mockOutput: OutputHandler = {
				startThinking: vi.fn(),
				stopThinking: vi.fn(),
				startTool: vi.fn(),
				stopTool: vi.fn(),
				showMessage: vi.fn(),
				showSuccess: vi.fn(),
				showError: vi.fn(),
				showDebug: vi.fn(),
				showHelp: vi.fn(),
			};

			const result = await processToolCall(toolUse, [plainTool], mockOutput);

			expect(result).toBeNull();
		});

		it("should execute RunnableTool and return result", async () => {
			const inputSchema = z.object({
				message: z.string(),
			});

			const mockRun = vi.fn().mockResolvedValue({ success: true });

			const runnableTool: RunnableTool<z.infer<typeof inputSchema>, unknown> = {
				tool: {
					name: "test_tool",
					description: "Test tool",
					input_schema: {
						type: "object",
						properties: {
							message: { type: "string" },
						},
						required: ["message"],
					},
				},
				input: inputSchema,
				run: mockRun,
			};

			const toolUse: Anthropic.Messages.ToolUseBlock = {
				type: "tool_use",
				id: "test-id",
				name: "test_tool",
				input: { message: "hello" },
			};

			const mockOutput: OutputHandler = {
				startThinking: vi.fn(),
				stopThinking: vi.fn(),
				startTool: vi.fn(),
				stopTool: vi.fn(),
				showMessage: vi.fn(),
				showSuccess: vi.fn(),
				showError: vi.fn(),
				showDebug: vi.fn(),
				showHelp: vi.fn(),
			};

			const result = await processToolCall(toolUse, [runnableTool], mockOutput);

			expect(mockRun).toHaveBeenCalledWith({ message: "hello" }, mockOutput);
			expect(result).toEqual({
				type: "tool_result",
				tool_use_id: "test-id",
				content: JSON.stringify({ success: true }),
				is_error: false,
			});
		});

		it("should return error for invalid input", async () => {
			const inputSchema = z.object({
				message: z.string(),
			});

			const runnableTool: RunnableTool<z.infer<typeof inputSchema>, unknown> = {
				tool: {
					name: "test_tool",
					description: "Test tool",
					input_schema: {
						type: "object",
						properties: {
							message: { type: "string" },
						},
						required: ["message"],
					},
				},
				input: inputSchema,
				run: vi.fn(),
			};

			const toolUse: Anthropic.Messages.ToolUseBlock = {
				type: "tool_use",
				id: "test-id",
				name: "test_tool",
				input: { message: 123 }, // Invalid: should be string
			};

			const mockOutput: OutputHandler = {
				startThinking: vi.fn(),
				stopThinking: vi.fn(),
				startTool: vi.fn(),
				stopTool: vi.fn(),
				showMessage: vi.fn(),
				showSuccess: vi.fn(),
				showError: vi.fn(),
				showDebug: vi.fn(),
				showHelp: vi.fn(),
			};

			const result = await processToolCall(toolUse, [runnableTool], mockOutput);

			expect(result?.is_error).toBe(true);
			expect(result?.content).toContain("Error: Invalid input");
			expect(mockOutput.showError).toHaveBeenCalled();
		});
	});

	describe("sendMessage", () => {
		it("should call anthropic API and return messages", async () => {
			const mockCreate = vi.fn().mockResolvedValue({
				id: "msg-id",
				type: "message",
				role: "assistant",
				content: [{ type: "text", text: "Hello!" }],
				model: "claude-sonnet-4-5",
				stop_reason: "end_turn",
				stop_sequence: null,
				usage: { input_tokens: 10, output_tokens: 5 },
			});

			const mockAnthropic = {
				messages: {
					create: mockCreate,
				},
			} as unknown as Anthropic;

			const mockOutput: OutputHandler = {
				startThinking: vi.fn(),
				stopThinking: vi.fn(),
				startTool: vi.fn(),
				stopTool: vi.fn(),
				showMessage: vi.fn(),
				showSuccess: vi.fn(),
				showError: vi.fn(),
				showDebug: vi.fn(),
				showHelp: vi.fn(),
			};

			const tools: Tool[] = [];
			const context: Anthropic.Messages.MessageParam[] = [
				{ role: "user", content: "Hi" },
			];

			const result = await sendMessage(
				mockAnthropic,
				"claude-sonnet-4-5",
				1024,
				tools,
				"System prompt",
				context,
				mockOutput,
				() => "end_turn",
			);

			expect(mockCreate).toHaveBeenCalledWith({
				model: "claude-sonnet-4-5",
				tools: [],
				system: "System prompt",
				max_tokens: 1024,
				messages: context,
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: "assistant",
				content: [{ type: "text", text: "Hello!" }],
			});

			expect(mockOutput.startThinking).toHaveBeenCalled();
			expect(mockOutput.stopThinking).toHaveBeenCalled();
			expect(mockOutput.showMessage).toHaveBeenCalledWith("Hello!");
		});

		it("should handle tool use and recursively call sendMessage", async () => {
			const inputSchema = z.object({
				query: z.string(),
			});

			const mockRun = vi.fn().mockResolvedValue({ result: "test result" });

			const runnableTool: RunnableTool<z.infer<typeof inputSchema>, unknown> = {
				tool: {
					name: "test_tool",
					description: "Test tool",
					input_schema: {
						type: "object",
						properties: {
							query: { type: "string" },
						},
						required: ["query"],
					},
				},
				input: inputSchema,
				run: mockRun,
			};

			let callCount = 0;
			const mockCreate = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call: tool use
					return Promise.resolve({
						id: "msg-id-1",
						type: "message",
						role: "assistant",
						content: [
							{
								type: "tool_use",
								id: "tool-id-1",
								name: "test_tool",
								input: { query: "test" },
							},
						],
						model: "claude-sonnet-4-5",
						stop_reason: "tool_use",
						stop_sequence: null,
						usage: { input_tokens: 10, output_tokens: 5 },
					});
				}
				// Second call: final response
				return Promise.resolve({
					id: "msg-id-2",
					type: "message",
					role: "assistant",
					content: [{ type: "text", text: "Done!" }],
					model: "claude-sonnet-4-5",
					stop_reason: "end_turn",
					stop_sequence: null,
					usage: { input_tokens: 15, output_tokens: 3 },
				});
			});

			const mockAnthropic = {
				messages: {
					create: mockCreate,
				},
			} as unknown as Anthropic;

			const mockOutput: OutputHandler = {
				startThinking: vi.fn(),
				stopThinking: vi.fn(),
				startTool: vi.fn(),
				stopTool: vi.fn(),
				showMessage: vi.fn(),
				showSuccess: vi.fn(),
				showError: vi.fn(),
				showDebug: vi.fn(),
				showHelp: vi.fn(),
			};

			const tools: Tool[] = [runnableTool];
			const context: Anthropic.Messages.MessageParam[] = [
				{ role: "user", content: "Run test" },
			];

			const result = await sendMessage(
				mockAnthropic,
				"claude-sonnet-4-5",
				1024,
				tools,
				"System prompt",
				context,
				mockOutput,
				() => "test",
			);

			// Should have called API twice (initial + recursive)
			expect(mockCreate).toHaveBeenCalledTimes(2);
			expect(mockRun).toHaveBeenCalledWith({ query: "test" }, mockOutput);

			// Should return multiple messages (assistant tool use + user tool result + assistant final)
			expect(result.length).toBeGreaterThan(1);
			expect(mockOutput.startTool).toHaveBeenCalledWith("test_tool");
			expect(mockOutput.stopTool).toHaveBeenCalled();
		});
	});
});
