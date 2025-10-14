import { beforeEach, describe, expect, it } from "vitest";
import { bashTool, type BashToolInput } from "../bashTool.js";

/**
 * Test suite for the Bash Tool
 * Tests RunnableTool with persistent session, security validation, and error handling
 *
 * Note: These tests run actual bash commands in a controlled manner.
 * Some tests verify security blocking, session persistence, and error scenarios.
 */

describe("Bash Tool", () => {
	describe("Tool Definition", () => {
		it("should have correct tool type and name", () => {
			expect(bashTool.tool).toHaveProperty("type", "bash_20250124");
			expect(bashTool.tool).toHaveProperty("name", "bash");
		});

		it("should be a RunnableTool with input and run methods", () => {
			expect(bashTool).toHaveProperty("input");
			expect(bashTool).toHaveProperty("run");
			expect(bashTool).toHaveProperty("tool");
			expect(typeof bashTool.run).toBe("function");
		});

		it("should have valid input schema", () => {
			expect(bashTool.input).toBeDefined();
			expect(bashTool.input.parse).toBeDefined();
		});
	});

	describe("Input Validation", () => {
		it("should validate correct input with command only", () => {
			const input = { command: "echo hello" };
			const result = bashTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should validate correct input with command and restart", () => {
			const input = { command: "pwd", restart: true };
			const result = bashTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should reject input without command", () => {
			const input = {};
			const result = bashTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject input with invalid command type", () => {
			const input = { command: 123 };
			const result = bashTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject input with invalid restart type", () => {
			const input = { command: "echo test", restart: "yes" };
			const result = bashTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should allow optional restart parameter", () => {
			const input = { command: "echo test" };
			const result = bashTool.input.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.restart).toBeUndefined();
			}
		});
	});

	describe("Command Execution", () => {
		it("should execute simple echo command successfully", async () => {
			const input: BashToolInput = { command: "echo 'test output'" };
			const result = await bashTool.run(input);

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("test output");
			expect(result.error).toBeUndefined();
		});

		it("should execute pwd command successfully", async () => {
			const input: BashToolInput = { command: "pwd" };
			const result = await bashTool.run(input);

			expect(result.success).toBe(true);
			expect(result.stdout).toBeDefined();
			expect(result.stdout?.length).toBeGreaterThan(0);
			expect(result.error).toBeUndefined();
		});

		it("should execute command with pipes", async () => {
			const input: BashToolInput = { command: "echo 'hello world' | wc -w" };
			const result = await bashTool.run(input);

			expect(result.success).toBe(true);
			expect(result.stdout?.trim()).toBe("2");
		});

		it("should handle commands that produce stderr without error", async () => {
			// Command that writes to stderr but succeeds
			const input: BashToolInput = {
				command: "echo 'error message' >&2 && echo 'success'",
			};
			const result = await bashTool.run(input);

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("success");
			expect(result.stderr).toBe("error message");
		});

		it("should trim stdout and stderr output", async () => {
			const input: BashToolInput = { command: "echo '  test  ' " };
			const result = await bashTool.run(input);

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("test");
		});
	});

	describe("Session Persistence - Directory", () => {
		beforeEach(async () => {
			// Reset session before each test
			await bashTool.run({ command: "pwd", restart: true });
		});

		it("should maintain working directory across commands", async () => {
			// Change to /tmp directory
			const cdResult = await bashTool.run({ command: "cd /tmp" });
			expect(cdResult.success).toBe(true);

			// Verify we're still in /tmp
			const pwdResult = await bashTool.run({ command: "pwd" });
			expect(pwdResult.success).toBe(true);
			expect(pwdResult.stdout).toBe("/tmp");
		});

		it("should handle relative directory changes", async () => {
			// Get current directory
			const initialResult = await bashTool.run({ command: "pwd" });
			const initialDir = initialResult.stdout || "";

			// Go to parent directory
			await bashTool.run({ command: "cd .." });

			// Verify we changed directory
			const afterResult = await bashTool.run({ command: "pwd" });
			expect(afterResult.stdout).not.toBe(initialDir);
		});

		it("should handle cd to home directory", async () => {
			const cdResult = await bashTool.run({ command: "cd ~" });
			expect(cdResult.success).toBe(true);

			const pwdResult = await bashTool.run({ command: "pwd" });
			expect(pwdResult.success).toBe(true);
			expect(pwdResult.stdout).toContain("/");
		});

		it("should handle failed cd gracefully", async () => {
			// Get current directory
			const beforeResult = await bashTool.run({ command: "pwd" });
			const beforeDir = beforeResult.stdout;

			// Try to cd to non-existent directory (should fail silently in session)
			await bashTool.run({ command: "cd /nonexistent/directory/path" });

			// Verify directory didn't change
			const afterResult = await bashTool.run({ command: "pwd" });
			expect(afterResult.stdout).toBe(beforeDir);
		});
	});

	describe("Session Persistence - Environment Variables", () => {
		beforeEach(async () => {
			// Reset session before each test
			await bashTool.run({ command: "pwd", restart: true });
		});

		it("should maintain environment variables across commands", async () => {
			// Set environment variable
			const exportResult = await bashTool.run({
				command: "export TEST_VAR=hello",
			});
			expect(exportResult.success).toBe(true);

			// Verify variable persists
			const echoResult = await bashTool.run({ command: "echo $TEST_VAR" });
			expect(echoResult.success).toBe(true);
			expect(echoResult.stdout).toBe("hello");
		});

		it("should handle environment variables with quotes", async () => {
			await bashTool.run({
				command: 'export QUOTED_VAR="hello world"',
			});

			const result = await bashTool.run({ command: "echo $QUOTED_VAR" });
			expect(result.success).toBe(true);
			expect(result.stdout).toBe("hello world");
		});

		it("should handle environment variables with special characters", async () => {
			await bashTool.run({
				command: "export SPECIAL_VAR=test-value_123",
			});

			const result = await bashTool.run({ command: "echo $SPECIAL_VAR" });
			expect(result.success).toBe(true);
			expect(result.stdout).toBe("test-value_123");
		});
	});

	describe("Session Restart", () => {
		it("should restart session successfully", async () => {
			const result = await bashTool.run({ command: "pwd", restart: true });

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("Bash session restarted successfully");
			expect(result.error).toBeUndefined();
		});

		it("should reset working directory on restart", async () => {
			// Change directory
			await bashTool.run({ command: "cd /tmp" });

			// Restart session
			await bashTool.run({ command: "pwd", restart: true });

			// Verify directory is reset to project directory
			const pwdResult = await bashTool.run({ command: "pwd" });
			expect(pwdResult.stdout).not.toBe("/tmp");
			expect(pwdResult.stdout).toContain("computer-agent");
		});

		it("should reset environment variables on restart", async () => {
			// Set a custom variable
			await bashTool.run({ command: "export CUSTOM_VAR=test" });

			// Verify it exists
			const beforeRestart = await bashTool.run({
				command: "echo $CUSTOM_VAR",
			});
			expect(beforeRestart.stdout).toBe("test");

			// Restart session
			await bashTool.run({ command: "pwd", restart: true });

			// Verify variable is cleared
			const afterRestart = await bashTool.run({ command: "echo $CUSTOM_VAR" });
			expect(afterRestart.stdout).toBe("");
		});
	});

	describe("Security - Blocked Commands", () => {
		it("should block rm -rf / command", async () => {
			const result = await bashTool.run({ command: "rm -rf /" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
			expect(result.error).toContain("blocked pattern");
		});

		it("should allow rm -rf with specific paths", async () => {
			// This should be allowed (specific path, not root)
			// We'll use a safe test that won't actually delete anything
			const result = await bashTool.run({ command: "rm -rf /tmp/nonexistent" });

			// Should not be blocked (actual execution may fail but not blocked)
			// Check that if there's an error, it's not a security block
			if (result.error) {
				expect(result.error).not.toContain("Blocked for security");
				expect(result.error).not.toContain("blocked pattern");
			}
			// The key test: should not have a security-related error
			expect(result.error || "").not.toContain("blocked pattern");
		});

		it("should block fork bomb", async () => {
			const result = await bashTool.run({ command: ":(){ :|:& };:" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should block mkfs command", async () => {
			const result = await bashTool.run({ command: "mkfs.ext4 /dev/sda1" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should block dd command with if parameter", async () => {
			const result = await bashTool.run({
				command: "dd if=/dev/zero of=/dev/sda",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should block direct disk device access without space", async () => {
			// Pattern matches >/dev/sd (no space between > and /dev)
			const result = await bashTool.run({
				command: "echo test>/dev/sda",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should handle disk device access with space (not blocked by pattern)", async () => {
			// Note: Pattern >/dev/sd doesn't match when there's a space
			// The command will fail with "Operation not permitted" instead of being blocked
			const result = await bashTool.run({
				command: "echo test > /dev/sda",
			});

			expect(result.success).toBe(false);
			// Will fail due to permissions, not security blocking
			if (result.error) {
				expect(
					result.error.includes("Operation not permitted") ||
						result.error.includes("Permission denied") ||
						result.error.includes("Blocked for security"),
				).toBe(true);
			}
		});

		it("should block shutdown command", async () => {
			const result = await bashTool.run({ command: "shutdown now" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should block halt command", async () => {
			const result = await bashTool.run({ command: "halt" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should block reboot command", async () => {
			const result = await bashTool.run({ command: "reboot" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});

		it("should block poweroff command", async () => {
			const result = await bashTool.run({ command: "poweroff" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Blocked for security");
		});
	});

	describe("Security - Interactive Commands", () => {
		it("should block vim", async () => {
			const result = await bashTool.run({ command: "vim test.txt" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});

		it("should block nano", async () => {
			const result = await bashTool.run({ command: "nano test.txt" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});

		it("should block emacs", async () => {
			const result = await bashTool.run({ command: "emacs test.txt" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});

		it("should block top", async () => {
			const result = await bashTool.run({ command: "top" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});

		it("should block htop", async () => {
			const result = await bashTool.run({ command: "htop" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});

		it("should block less", async () => {
			const result = await bashTool.run({ command: "less test.txt" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});

		it("should block more", async () => {
			const result = await bashTool.run({ command: "more test.txt" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("Interactive commands are not supported");
		});
	});

	describe("Error Handling", () => {
		it("should handle command not found error", async () => {
			const result = await bashTool.run({
				command: "nonexistentcommand12345",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			// May be "Command not found" or contain error message
			expect(result.error || result.stderr).toBeTruthy();
		});

		it("should handle command with non-zero exit code", async () => {
			const result = await bashTool.run({ command: "exit 1" });

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should handle commands with syntax errors", async () => {
			const result = await bashTool.run({ command: "echo 'unclosed quote" });

			expect(result.success).toBe(false);
			expect(result.error || result.stderr).toBeTruthy();
		});

		it("should include stderr in failed command results", async () => {
			// Command that writes to stderr and fails
			const result = await bashTool.run({
				command: "ls /nonexistent/path/that/does/not/exist",
			});

			expect(result.success).toBe(false);
			expect(result.stderr || result.error).toBeTruthy();
		});
	});

	describe("Timeout Handling", () => {
		it("should timeout long-running commands", async () => {
			// This test verifies timeout works but may take 30+ seconds
			// Consider skipping in CI or adjusting timeout
			const result = await bashTool.run({ command: "sleep 35" });

			expect(result.success).toBe(false);
			expect(result.error).toContain("timed out");
		}, 35000); // Set test timeout longer than command timeout
	});

	describe("Output Buffer Handling", () => {
		it("should handle commands with moderate output", async () => {
			// Generate ~1KB of output
			const result = await bashTool.run({
				command: 'for i in {1..100}; do echo "Line $i"; done',
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toBeDefined();
			expect(result.stdout?.split("\n").length).toBeGreaterThan(90);
		});

		it("should handle empty output", async () => {
			const result = await bashTool.run({ command: "true" });

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("");
		});
	});

	describe("Complex Command Scenarios", () => {
		it("should handle command with multiple pipes", async () => {
			const result = await bashTool.run({
				command: "echo 'hello world test' | tr ' ' '\\n' | wc -l",
			});

			expect(result.success).toBe(true);
			expect(result.stdout?.trim()).toBe("3");
		});

		it("should handle command with redirection", async () => {
			const result = await bashTool.run({
				command:
					"echo 'test' > /tmp/bash_test_$$.txt && cat /tmp/bash_test_$$.txt && rm /tmp/bash_test_$$.txt",
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("test");
		});

		it("should handle commands with variables", async () => {
			const result = await bashTool.run({
				command: 'FOO="bar" && echo $FOO',
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("bar");
		});

		it("should handle commands with subshells", async () => {
			const result = await bashTool.run({
				command: 'echo "Result: $(echo nested)"',
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("Result: nested");
		});

		it("should handle conditional execution with &&", async () => {
			const result = await bashTool.run({
				command: "echo 'first' && echo 'second'",
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("first");
			expect(result.stdout).toContain("second");
		});

		it("should handle conditional execution with ||", async () => {
			const result = await bashTool.run({
				command: "false || echo 'fallback'",
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("fallback");
		});
	});

	describe("Type Guard Compatibility", () => {
		it("should be correctly identified as RunnableTool", async () => {
			const { isRunnableTool } = await import("../types.js");

			expect(isRunnableTool(bashTool)).toBe(true);
		});

		it("should have all required RunnableTool properties", () => {
			expect(bashTool).toHaveProperty("tool");
			expect(bashTool).toHaveProperty("input");
			expect(bashTool).toHaveProperty("run");

			expect(typeof bashTool.tool).toBe("object");
			expect(typeof bashTool.input).toBe("object");
			expect(typeof bashTool.run).toBe("function");
		});
	});
});
