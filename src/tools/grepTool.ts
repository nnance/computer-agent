import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { RunnableTool } from "./types.js";

const execAsync = promisify(exec);

/**
 * Result from grep tool execution
 */
interface GrepResult {
	success: boolean;
	content?: string;
	error?: string;
}

/**
 * Zod schema for grep tool input parameters
 */
const GrepInputSchema = z.object({
	pattern: z.string().describe("The regular expression pattern to search for"),
	path: z
		.string()
		.optional()
		.describe("File or directory to search in (defaults to current directory)"),
	output_mode: z
		.enum(["content", "files_with_matches", "count"])
		.optional()
		.default("files_with_matches")
		.describe(
			'Output mode: "content" shows matching lines, "files_with_matches" shows file paths, "count" shows match counts',
		),
	type: z
		.string()
		.optional()
		.describe("File type to search (e.g., js, py, rust, go, java)"),
	glob: z
		.string()
		.optional()
		.describe('Glob pattern to filter files (e.g., "*.js", "**/*.tsx")'),
	"-i": z.boolean().optional().describe("Case insensitive search"),
	"-n": z
		.boolean()
		.optional()
		.describe("Show line numbers in output (requires output_mode: content)"),
	"-A": z
		.number()
		.optional()
		.describe(
			"Number of lines to show after each match (requires output_mode: content)",
		),
	"-B": z
		.number()
		.optional()
		.describe(
			"Number of lines to show before each match (requires output_mode: content)",
		),
	"-C": z
		.number()
		.optional()
		.describe(
			"Number of lines to show before and after each match (requires output_mode: content)",
		),
	multiline: z
		.boolean()
		.optional()
		.describe(
			"Enable multiline mode where . matches newlines and patterns can span lines",
		),
	head_limit: z
		.number()
		.optional()
		.describe("Limit output to first N lines/entries"),
});

type GrepToolInput = z.infer<typeof GrepInputSchema>;

/**
 * Builds the ripgrep command from input parameters
 */

// TODO: Display warning if the grep tool (rg) is not installed
function buildGrepCommand(input: GrepToolInput): string {
	const args: string[] = ["rg"];

	// Output mode flags
	switch (input.output_mode) {
		case "files_with_matches":
			args.push("--files-with-matches");
			break;
		case "count":
			args.push("--count");
			break;
		case "content":
			// Default mode, no special flag needed
			break;
	}

	// Case insensitive
	if (input["-i"]) {
		args.push("--ignore-case");
	}

	// Line numbers (only for content mode)
	if (input["-n"] && input.output_mode === "content") {
		args.push("--line-number");
	}

	// Context lines (only for content mode)
	if (input["-A"] && input.output_mode === "content") {
		args.push(`--after-context=${input["-A"]}`);
	}
	if (input["-B"] && input.output_mode === "content") {
		args.push(`--before-context=${input["-B"]}`);
	}
	if (input["-C"] && input.output_mode === "content") {
		args.push(`--context=${input["-C"]}`);
	}

	// Multiline mode
	if (input.multiline) {
		args.push("--multiline");
		args.push("--multiline-dotall");
	}

	// File type filter
	if (input.type) {
		args.push(`--type=${input.type}`);
	}

	// Glob pattern filter
	if (input.glob) {
		args.push(`--glob=${input.glob}`);
	}

	// Add the pattern (properly escaped)
	args.push(input.pattern);

	// Add path if specified
	if (input.path) {
		args.push(input.path);
	}

	// Build the final command
	let command = args.join(" ");

	// Add head limit if specified
	if (input.head_limit) {
		command += ` | head -n ${input.head_limit}`;
	}

	return command;
}

/**
 * Grep tool for searching file contents using ripgrep
 */
export const grepTool: RunnableTool<GrepToolInput, GrepResult> = {
	tool: {
		name: "grep",
		description:
			"Powerful search tool built on ripgrep for searching file contents with regular expressions. Supports filtering by file type, glob patterns, and various output modes.",
		input_schema: {
			type: "object",
			properties: {
				pattern: {
					type: "string",
					description: "The regular expression pattern to search for",
				},
				path: {
					type: "string",
					description:
						"File or directory to search in (defaults to current directory)",
				},
				output_mode: {
					type: "string",
					enum: ["content", "files_with_matches", "count"],
					description:
						'Output mode: "content" shows matching lines, "files_with_matches" shows file paths, "count" shows match counts',
					default: "files_with_matches",
				},
				type: {
					type: "string",
					description: "File type to search (e.g., js, py, rust, go, java)",
				},
				glob: {
					type: "string",
					description:
						'Glob pattern to filter files (e.g., "*.js", "**/*.tsx")',
				},
				"-i": {
					type: "boolean",
					description: "Case insensitive search",
				},
				"-n": {
					type: "boolean",
					description:
						"Show line numbers in output (requires output_mode: content)",
				},
				"-A": {
					type: "number",
					description:
						"Number of lines to show after each match (requires output_mode: content)",
				},
				"-B": {
					type: "number",
					description:
						"Number of lines to show before each match (requires output_mode: content)",
				},
				"-C": {
					type: "number",
					description:
						"Number of lines to show before and after each match (requires output_mode: content)",
				},
				multiline: {
					type: "boolean",
					description:
						"Enable multiline mode where . matches newlines and patterns can span lines",
				},
				head_limit: {
					type: "number",
					description: "Limit output to first N lines/entries",
				},
			},
			required: ["pattern"],
		},
	},
	input: GrepInputSchema,
	run: async (input) => {
		try {
			const command = buildGrepCommand(input);
			console.log(`Executing: ${command}`);

			const { stdout, stderr } = await execAsync(command, {
				timeout: 30000, // 30 second timeout
				maxBuffer: 1024 * 1024 * 10, // 10MB buffer
			});

			const trimmedStdout = stdout.trim();
			const trimmedStderr = stderr.trim();

			// Ripgrep returns exit code 1 when no matches are found
			// This is not an error, just no results
			return {
				success: true,
				content: trimmedStdout || "No matches found",
				...(trimmedStderr && { error: trimmedStderr }),
			};
		} catch (error: any) {
			// Handle specific error cases
			if (error.killed) {
				return {
					success: false,
					error: "Search timed out after 30 seconds",
				};
			}

			// Exit code 1 means no matches found (not an error)
			if (error.code === 1) {
				return {
					success: true,
					content: "No matches found",
				};
			}

			// Exit code 2 means error
			if (error.code === 2) {
				return {
					success: false,
					error: error.stderr?.trim() || "Ripgrep encountered an error",
				};
			}

			// Command not found (ripgrep not installed)
			if (error.code === "ENOENT") {
				return {
					success: false,
					error:
						"ripgrep (rg) is not installed. Please install it: https://github.com/BurntSushi/ripgrep#installation",
				};
			}

			return {
				success: false,
				error: error.message || "Unknown error occurred",
			};
		}
	},
};

export type { GrepResult, GrepToolInput };
