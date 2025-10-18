import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { loadContext, stopReason } from "../../helpers/utilities.js";
import * as textEditorTool from "../../tools/textEditorTool.js";

describe("utilities", () => {
	describe("loadContext", () => {
		it("should load context from file and generate system prompt", () => {
			const mockHandleView = vi
				.spyOn(textEditorTool, "handleView")
				.mockReturnValue({
					content: "Test context content",
				});

			const result = loadContext("/test/path.md");

			expect(mockHandleView).toHaveBeenCalledWith("/test/path.md");
			expect(result).toContain("Test context content");
			expect(result).toContain("You are a helpful assistant");
			expect(result).toContain("Apple Notes");
			expect(result).toContain("Calendar");
			expect(result).toContain("web search");
			expect(result).toContain("web fetch");

			mockHandleView.mockRestore();
		});

		it("should handle missing context file gracefully", () => {
			const mockHandleView = vi
				.spyOn(textEditorTool, "handleView")
				.mockReturnValue(null);

			const result = loadContext("/nonexistent/path.md");

			expect(mockHandleView).toHaveBeenCalledWith("/nonexistent/path.md");
			expect(result).toContain("No context available");
			expect(result).toContain("You are a helpful assistant");

			mockHandleView.mockRestore();
		});

		it("should handle undefined return from handleView", () => {
			const mockHandleView = vi
				.spyOn(textEditorTool, "handleView")
				.mockReturnValue(undefined as any);

			const result = loadContext("/test/path.md");

			expect(result).toContain("No context available");

			mockHandleView.mockRestore();
		});
	});

	describe("stopReason", () => {
		it("should return correct message for max_tokens", () => {
			const result = stopReason("max_tokens");
			expect(result).toBe("Max tokens reached.");
		});

		it("should return correct message for stop_sequence", () => {
			const result = stopReason("stop_sequence");
			expect(result).toBe("Custom stop sequence encountered.");
		});

		it("should return correct message for tool_use", () => {
			const result = stopReason("tool_use");
			expect(result).toBe("Tool use initiated.");
		});

		it("should return correct message for end_turn", () => {
			const result = stopReason("end_turn");
			expect(result).toBe("Reached natural stopping point.");
		});

		it("should return correct message for model_context_window_exceeded", () => {
			const result = stopReason("model_context_window_exceeded");
			expect(result).toBe("Model context window exceeded.");
		});

		it("should return correct message for pause_turn", () => {
			const result = stopReason("pause_turn");
			expect(result).toBe("Paused long-running turn.");
		});

		it("should return correct message for refusal", () => {
			const result = stopReason("refusal");
			expect(result).toBe("Refusal to respond.");
		});

		it("should return default message for null", () => {
			const result = stopReason(null);
			expect(result).toBe("Unknown stop reason.");
		});

		it("should return default message for unknown reason", () => {
			const result = stopReason(
				"unknown_reason" as Anthropic.Messages.StopReason,
			);
			expect(result).toBe("Unknown stop reason.");
		});
	});
});
