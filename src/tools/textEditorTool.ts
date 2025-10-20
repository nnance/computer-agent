import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { RunnableTool } from "./types.js";

interface EditorResult {
	success: boolean;
	content?: string;
	error?: string;
}

const toolVersion = "text_editor_20250728";

const TextEditorInputSchema = z.object({
	command: z
		.enum(["view", "create", "str_replace", "insert"])
		.describe(
			"Command to execute: 'view' to view file contents, 'create' to create a new file, 'str_replace' to replace text, 'insert' to insert text at a specific line.",
		),
	path: z.string().describe("Path to the file to operate on"),
	view_range: z.tuple([z.number().min(1), z.number().min(1)]).optional(),
	old_str: z.string().optional(),
	new_str: z.string().optional(),
	file_text: z.string().optional(),
	insert_line: z.number().min(1).optional(),
});

type EditorToolInput = z.infer<typeof TextEditorInputSchema>;

const textEditorTool: RunnableTool<EditorToolInput, EditorResult> = {
	tool: {
		type: toolVersion,
		name: "str_replace_based_edit_tool",
		max_characters: 10000,
	},
	input: TextEditorInputSchema,
	run: async (input, output) => {
		const result = handleEditorTool(input);
		output?.showDebug(`Result: ${result.success ? "✓ Success" : "✗ Failed"}`);
		if (result.error) {
			output?.showError(`Error: ${result.error}`);
		}
		return result;
	},
};

// Store edit history for undo functionality
const editHistory = new Map<string, string[]>();

function handleEditorTool(toolCall: EditorToolInput): EditorResult {
	const { command, path: filePath } = toolCall;

	switch (command) {
		case "view":
			return handleView(filePath, toolCall.view_range);

		case "str_replace":
			return handleStrReplace(filePath, toolCall.old_str!, toolCall.new_str!);

		case "create":
			return handleCreate(filePath, toolCall.file_text || "");

		case "insert":
			return handleInsert(filePath, toolCall.insert_line!, toolCall.new_str!);

		default:
			return { success: false, error: `Unknown command: ${command}` };
	}
}

function handleView(
	filePath: string,
	viewRange?: [number, number],
): EditorResult {
	try {
		if (!fs.existsSync(filePath)) {
			return { success: false, error: `File not found: ${filePath}` };
		}

		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			const files = fs.readdirSync(filePath);
			return {
				success: true,
				content: `Directory contents:\n${files.join("\n")}`,
			};
		}

		let content = fs.readFileSync(filePath, "utf-8");

		if (viewRange) {
			const lines = content.split("\n");
			const [start, end] = viewRange;
			content = lines.slice(start - 1, end).join("\n");
		}

		return { success: true, content };
	} catch (error) {
		return { success: false, error: `Error viewing file: ${error}` };
	}
}

function handleStrReplace(
	filePath: string,
	oldStr: string,
	newStr: string,
): EditorResult {
	try {
		if (!fs.existsSync(filePath)) {
			return { success: false, error: `File not found: ${filePath}` };
		}

		const content = fs.readFileSync(filePath, "utf-8");

		// Store original content for undo
		if (!editHistory.has(filePath)) {
			editHistory.set(filePath, []);
		}
		editHistory.get(filePath)!.push(content);

		if (!content.includes(oldStr)) {
			return { success: false, error: "String to replace not found in file" };
		}

		const newContent = content.replace(oldStr, newStr);
		fs.writeFileSync(filePath, newContent, "utf-8");

		return { success: true, content: "File updated successfully" };
	} catch (error) {
		return { success: false, error: `Error replacing text: ${error}` };
	}
}

function handleCreate(filePath: string, fileText: string): EditorResult {
	try {
		if (fs.existsSync(filePath)) {
			return { success: false, error: `File already exists: ${filePath}` };
		}

		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.writeFileSync(filePath, fileText, "utf-8");
		return { success: true, content: "File created successfully" };
	} catch (error) {
		return { success: false, error: `Error creating file: ${error}` };
	}
}

function handleInsert(
	filePath: string,
	insertLine: number,
	newStr: string,
): EditorResult {
	try {
		if (!fs.existsSync(filePath)) {
			return { success: false, error: `File not found: ${filePath}` };
		}

		const content = fs.readFileSync(filePath, "utf-8");

		// Store original content for undo
		if (!editHistory.has(filePath)) {
			editHistory.set(filePath, []);
		}
		editHistory.get(filePath)!.push(content);

		const lines = content.split("\n");
		lines.splice(insertLine, 0, newStr);

		const newContent = lines.join("\n");
		fs.writeFileSync(filePath, newContent, "utf-8");

		return { success: true, content: "Text inserted successfully" };
	} catch (error) {
		return { success: false, error: `Error inserting text: ${error}` };
	}
}

export { textEditorTool, handleView, type EditorToolInput, type EditorResult };
