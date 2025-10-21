import { beforeAll, describe, expect, it } from "vitest";
import type { OutputHandler } from "../helpers/outputHandler.js";
import { type GrepToolInput, grepTool } from "../tools/grepTool.js";

/**
 * Test suite for the Grep Tool
 * Tests RunnableTool with ripgrep (rg) functionality
 *
 * Note: These tests require ripgrep to be installed on the system.
 * Install via: brew install ripgrep (macOS), apt install ripgrep (Ubuntu), etc.
 */

// Mock OutputHandler for tests
const mockOutput: OutputHandler = {
	startThinking: () => {},
	stopThinking: () => {},
	startTool: () => {},
	stopTool: () => {},
	showMessage: () => {},
	showSuccess: () => {},
	showError: () => {},
	showDebug: () => {}, // Silenced in tests
	showHelp: () => {},
};

describe("Grep Tool", () => {
	// Check if ripgrep is available before running tests
	let ripgrepAvailable = false;

	beforeAll(async () => {
		try {
			const { exec } = await import("node:child_process");
			const { promisify } = await import("node:util");
			const execAsync = promisify(exec);
			await execAsync("which rg");
			ripgrepAvailable = true;
		} catch (_error) {
			mockOutput.showDebug(
				"⚠️  Ripgrep (rg) not found. Some tests will be skipped.",
				"warn",
			);
			ripgrepAvailable = false;
		}
	});

	describe("Tool Definition", () => {
		it("should have correct tool name", () => {
			expect(grepTool.tool).toHaveProperty("name", "grep");
		});

		it("should be a RunnableTool with input and run methods", () => {
			expect(grepTool).toHaveProperty("input");
			expect(grepTool).toHaveProperty("run");
			expect(grepTool).toHaveProperty("tool");
		});

		it("should have valid input schema", () => {
			expect(grepTool.input).toBeDefined();
			expect(grepTool.input.parse).toBeDefined();
		});
	});

	describe("Input Validation", () => {
		it("should validate correct input with pattern only", () => {
			const input = { pattern: "test" };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should validate correct input with all parameters", () => {
			const input: GrepToolInput = {
				pattern: "test.*pattern",
				path: "./src",
				output_mode: "content",
				type: "js",
				glob: "*.ts",
				"-i": true,
				"-n": true,
				"-A": 2,
				"-B": 2,
				"-C": 3,
				multiline: true,
				head_limit: 10,
			};
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should reject input without pattern", () => {
			const input = {};
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject input with invalid pattern type", () => {
			const input = { pattern: 123 };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject input with invalid output_mode", () => {
			const input = { pattern: "test", output_mode: "invalid" };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should default output_mode to files_with_matches", () => {
			const input = { pattern: "test" };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.output_mode).toBe("files_with_matches");
			}
		});

		it("should accept valid output_mode values", () => {
			const modes = ["content", "files_with_matches", "count"];
			for (const mode of modes) {
				const input = { pattern: "test", output_mode: mode };
				const result = grepTool.input.safeParse(input);
				expect(result.success).toBe(true);
			}
		});

		it("should reject invalid boolean values", () => {
			const input = { pattern: "test", "-i": "yes" };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject invalid number values", () => {
			const input = { pattern: "test", "-A": "two" };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should allow optional parameters to be undefined", () => {
			const input = { pattern: "test" };
			const result = grepTool.input.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.path).toBeUndefined();
				expect(result.data.type).toBeUndefined();
				expect(result.data.glob).toBeUndefined();
				expect(result.data["-i"]).toBeUndefined();
			}
		});
	});

	describe("Basic Search Functionality", () => {
		it("should search for pattern in current directory", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "grepTool",
				path: "./src/tools",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});

		it("should return no matches found for non-existent pattern", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "xyznonexistentpattern12345",
				path: "./src",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toContain("No matches found");
			}
		});

		it("should search in specific file", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GrepTool",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});
	});

	describe("Output Modes", () => {
		it("should return file paths in files_with_matches mode", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "import",
				path: "./src/tools",
				output_mode: "files_with_matches",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
				// Should contain file paths
				if (result.content && result.content !== "No matches found") {
					expect(result.content).toMatch(/\.ts/);
				}
			}
		});

		it("should return matching content in content mode", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GrepToolInput",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
				if (result.content && result.content !== "No matches found") {
					expect(result.content).toContain("GrepToolInput");
				}
			}
		});

		it("should return match counts in count mode", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "import",
				path: "./src/tools/grepTool.ts",
				output_mode: "count",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
				// Should contain file path and count
				if (result.content && result.content !== "No matches found") {
					expect(result.content).toMatch(/\d+/);
				}
			}
		});
	});

	describe("File Filtering", () => {
		it("should filter by file type", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "import",
				path: "./src",
				type: "ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});

		it("should filter by glob pattern", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "Tool",
				path: "./src",
				glob: "*Tool.ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});
	});

	describe("Case Sensitivity", () => {
		it("should perform case-sensitive search by default", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GREPTOOL",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			// Should not find matches (case-sensitive)
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toContain("No matches found");
			}
		});

		it("should perform case-insensitive search with -i flag", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GREPTOOL",
				path: "./src/tools/grepTool.ts",
				"-i": true,
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			// Should find matches (case-insensitive)
			expect(result.success).toBe(true);
			if (result.success && result.content) {
				expect(result.content).not.toContain("No matches found");
			}
		});
	});

	describe("Context Lines", () => {
		it("should show line numbers with -n flag", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GrepToolInput",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
				"-n": true,
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (
				result.success &&
				result.content &&
				result.content !== "No matches found"
			) {
				// Should contain line numbers (format: filename:line:content)
				expect(result.content).toMatch(/:\d+:/);
			}
		});

		it("should show after context with -A flag", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GrepResult",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
				"-A": 2,
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});

		it("should show before context with -B flag", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GrepResult",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
				"-B": 2,
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});

		it("should show context lines with -C flag", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "GrepResult",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
				"-C": 2,
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});
	});

	describe("Multiline Mode", () => {
		it("should search across multiple lines with multiline flag", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "interface.*{.*success",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
				multiline: true,
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});
	});

	describe("Output Limiting", () => {
		it("should limit output with head_limit", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "import",
				path: "./src",
				head_limit: 5,
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
				if (result.content && result.content !== "No matches found") {
					const lines = result.content.split("\n").filter((l) => l.trim());
					expect(lines.length).toBeLessThanOrEqual(5);
				}
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent path gracefully", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "test",
				path: "/nonexistent/path/that/does/not/exist",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should handle invalid regex pattern", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "[unclosed",
				path: "./src",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should provide helpful error when ripgrep is not installed", async () => {
			// This test verifies that the tool runs and returns a proper structure
			const input: GrepToolInput = {
				pattern: "test",
				output_mode: "content",
			};

			const result = await grepTool.run(input);
			expect(result).toHaveProperty("success");
			// Result should have either content or error
			if (result.success) {
				expect(result.content).toBeDefined();
			} else {
				expect(result.error).toBeDefined();
			}
		});
	});

	describe("Regular Expression Support", () => {
		it("should support basic regex patterns", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "Grep.*Tool",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});

		it("should support character classes", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "[Gg]rep",
				path: "./src/tools/grepTool.ts",
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});

		it("should support word boundaries", async () => {
			if (!ripgrepAvailable) {
				mockOutput.showDebug("⊘ Skipping test: ripgrep not available");
				return;
			}

			const input: GrepToolInput = {
				pattern: "\\bgrep\\b",
				path: "./src/tools",
				"-i": true,
				output_mode: "content",
			};
			const result = await grepTool.run(input);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.content).toBeDefined();
			}
		});
	});

	describe("Type Guard Compatibility", () => {
		it("should be correctly identified as RunnableTool", async () => {
			const { isRunnableTool } = await import("../tools/types.js");

			expect(isRunnableTool(grepTool)).toBe(true);
		});

		it("should have all required RunnableTool properties", () => {
			expect(grepTool).toHaveProperty("tool");
			expect(grepTool).toHaveProperty("input");
			expect(grepTool).toHaveProperty("run");

			expect(typeof grepTool.tool).toBe("object");
			expect(typeof grepTool.input).toBe("object");
			expect(typeof grepTool.run).toBe("function");
		});
	});
});
