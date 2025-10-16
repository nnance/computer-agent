import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { RunnableTool } from "./types.js";

const execAsync = promisify(exec);

interface BashResult {
	success: boolean;
	stdout?: string;
	stderr?: string;
	error?: string;
}

const toolVersion = "bash_20250124";

const BashInputSchema = z.object({
	command: z.string().describe("The bash shell command to execute"),
	restart: z
		.boolean()
		.optional()
		.describe("Set to true to restart the bash session"),
});

type BashToolInput = z.infer<typeof BashInputSchema>;

// Maintain persistent bash session state
let sessionWorkingDir: string = process.cwd();
let sessionEnvVars: Record<string, string> = Object.entries(process.env).reduce(
	(acc, [key, value]) => {
		if (value !== undefined) {
			acc[key] = value;
		}
		return acc;
	},
	{} as Record<string, string>,
);

// Security: List of dangerous command patterns to block
const BLOCKED_PATTERNS = [
	/rm\s+-rf\s+\/(?!\w)/i, // Prevent rm -rf / (but allow specific paths)
	/:\(\)\s*{\s*:\|:&\s*}\s*;:/i, // Fork bomb
	/mkfs/i, // Format filesystem
	/dd\s+if=/i, // Disk writing
	/>\/dev\/sd/i, // Direct disk device access
	/shutdown|halt|reboot|poweroff/i, // System shutdown
];

const bashTool: RunnableTool<BashToolInput, BashResult> = {
	tool: {
		type: toolVersion,
		name: "bash",
	},
	input: BashInputSchema,
	run: async (input) => {
		const result = await handleBashCommand(input);
		console.log(`Result: ${result.success ? "✓ Success" : "✗ Failed"}`);
		if (result.stderr) {
			console.log(`stderr: ${result.stderr}`);
		}
		if (result.error) {
			console.log(`Error: ${result.error}`);
		}
		return result;
	},
};

async function handleBashCommand(toolCall: BashToolInput): Promise<BashResult> {
	const { command, restart } = toolCall;

	// Handle session restart
	if (restart) {
		sessionWorkingDir = process.cwd();
		sessionEnvVars = Object.entries(process.env).reduce(
			(acc, [key, value]) => {
				if (value !== undefined) {
					acc[key] = value;
				}
				return acc;
			},
			{} as Record<string, string>,
		);
		return {
			success: true,
			stdout: "Bash session restarted successfully",
		};
	}

	// Security: Validate command safety
	const safetyCheck = validateCommandSafety(command);
	if (!safetyCheck.safe) {
		return {
			success: false,
			error: `Blocked for security: ${safetyCheck.reason}`,
		};
	}

	try {
		// Build the command with session state preservation
		const fullCommand = buildCommandWithSession(command);

		// Execute command with timeout
		const { stdout, stderr } = await execAsync(fullCommand, {
			cwd: sessionWorkingDir,
			env: sessionEnvVars,
			timeout: 30000, // 30 second timeout
			maxBuffer: 1024 * 1024 * 10, // 10MB buffer
		});

		// Update session state if the command changes directory or environment
		await updateSessionState(command);

		const trimmedStderr = stderr.trim();
		return {
			success: true,
			stdout: stdout.trim(),
			...(trimmedStderr && { stderr: trimmedStderr }),
		};
	} catch (error: any) {
		// Handle different types of errors
		if (error.killed) {
			return {
				success: false,
				error: "Command timed out after 30 seconds",
			};
		}

		if (error.code === "ENOENT") {
			return {
				success: false,
				error: "Command not found",
			};
		}

		if (error.code === "EACCES") {
			return {
				success: false,
				error: "Permission denied",
			};
		}

		return {
			success: false,
			error: error.message,
			stdout: error.stdout?.trim(),
			stderr: error.stderr?.trim(),
		};
	}
}

function validateCommandSafety(command: string): {
	safe: boolean;
	reason?: string;
} {
	// Check against blocked patterns
	for (const pattern of BLOCKED_PATTERNS) {
		if (pattern.test(command)) {
			return {
				safe: false,
				reason: "Command matches blocked pattern for system safety",
			};
		}
	}

	// Block interactive commands
	const interactiveCommands = [
		"vim",
		"nano",
		"emacs",
		"top",
		"htop",
		"less",
		"more",
	];
	const commandName = command.trim().split(/\s+/)[0];
	if (commandName && interactiveCommands.includes(commandName)) {
		return {
			safe: false,
			reason: "Interactive commands are not supported",
		};
	}

	return { safe: true };
}

function buildCommandWithSession(command: string): string {
	// Preserve the working directory by prepending cd command
	// This ensures the command runs in the session's working directory
	return `cd "${sessionWorkingDir}" && ${command}`;
}

async function updateSessionState(command: string): Promise<void> {
	// Check if command changes directory
	const cdMatch = command.match(/^cd\s+(.+)$/);
	if (cdMatch && cdMatch[1]) {
		const targetDir = cdMatch[1].trim().replace(/^["']|["']$/g, "");

		try {
			// Resolve the new directory
			const { stdout } = await execAsync(
				`cd "${sessionWorkingDir}" && cd "${targetDir}" && pwd`,
				{
					timeout: 5000,
				},
			);
			sessionWorkingDir = stdout.trim();
		} catch (error) {
			// If cd fails, keep the current directory
			console.error("Failed to update working directory:", error);
		}
	}

	// Check if command sets environment variables
	const exportMatch = command.match(/^export\s+(\w+)=(.+)$/);
	if (exportMatch && exportMatch.length >= 3) {
		const key = exportMatch[1];
		const value = exportMatch[2];
		if (key && value) {
			sessionEnvVars[key] = value.trim().replace(/^["']|["']$/g, "");
		}
	}
}

export { bashTool, type BashToolInput, type BashResult };
