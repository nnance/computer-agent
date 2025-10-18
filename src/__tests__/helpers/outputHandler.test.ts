import { describe, expect, it, vi } from "vitest";
import {
	createInteractiveOutput,
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

		it("should call console.log for showMessage", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.showMessage("test message");

			expect(consoleSpy).toHaveBeenCalledWith("test message");
			consoleSpy.mockRestore();
		});

		it("should call console.log for showSuccess", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.showSuccess("success message");

			expect(consoleSpy).toHaveBeenCalledWith("success message");
			consoleSpy.mockRestore();
		});

		it("should call console.error for showError", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const output = createNonInteractiveOutput();

			output.showError("error message");

			expect(consoleSpy).toHaveBeenCalledWith("error message");
			consoleSpy.mockRestore();
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
});
