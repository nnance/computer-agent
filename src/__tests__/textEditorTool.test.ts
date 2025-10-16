import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
	textEditorTool,
	handleView,
} from "../tools/textEditorTool.js";

describe("textEditorTool", () => {
	let testDir: string;
	let testFilePath: string;

	beforeEach(() => {
		// Create a temporary directory for each test
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), "text-editor-test-"));
		testFilePath = path.join(testDir, "test-file.txt");
	});

	afterEach(() => {
		// Clean up temporary directory after each test
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("Zod input validation", () => {
		it("should validate correct input for view command", () => {
			const input = {
				command: "view" as const,
				path: "/path/to/file.txt",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should validate correct input for create command", () => {
			const input = {
				command: "create" as const,
				path: "/path/to/file.txt",
				file_text: "Hello, world!",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should validate correct input for str_replace command", () => {
			const input = {
				command: "str_replace" as const,
				path: "/path/to/file.txt",
				old_str: "old",
				new_str: "new",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should validate correct input for insert command", () => {
			const input = {
				command: "insert" as const,
				path: "/path/to/file.txt",
				insert_line: 5,
				new_str: "New line content",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should reject invalid command", () => {
			const input = {
				command: "invalid",
				path: "/path/to/file.txt",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject missing path", () => {
			const input = {
				command: "view",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should validate view_range as tuple of two numbers", () => {
			const input = {
				command: "view" as const,
				path: "/path/to/file.txt",
				view_range: [1, 10] as [number, number],
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("should reject view_range with values less than 1", () => {
			const input = {
				command: "view" as const,
				path: "/path/to/file.txt",
				view_range: [0, 10],
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("should reject insert_line less than 1", () => {
			const input = {
				command: "insert" as const,
				path: "/path/to/file.txt",
				insert_line: 0,
				new_str: "content",
			};
			const result = textEditorTool.input.safeParse(input);
			expect(result.success).toBe(false);
		});
	});

	describe("view command", () => {
		it("should view entire file contents", async () => {
			const content = "Line 1\nLine 2\nLine 3";
			fs.writeFileSync(testFilePath, content, "utf-8");

			const result = await textEditorTool.run({
				command: "view",
				path: testFilePath,
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe(content);
		});

		it("should view file with view_range", async () => {
			const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
			fs.writeFileSync(testFilePath, content, "utf-8");

			const result = await textEditorTool.run({
				command: "view",
				path: testFilePath,
				view_range: [2, 4],
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe("Line 2\nLine 3\nLine 4");
		});

		it("should return error when file does not exist", async () => {
			const result = await textEditorTool.run({
				command: "view",
				path: "/nonexistent/file.txt",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should list directory contents when path is a directory", async () => {
			const dirPath = path.join(testDir, "subdir");
			fs.mkdirSync(dirPath);
			fs.writeFileSync(path.join(dirPath, "file1.txt"), "");
			fs.writeFileSync(path.join(dirPath, "file2.txt"), "");

			const result = await textEditorTool.run({
				command: "view",
				path: dirPath,
			});

			expect(result.success).toBe(true);
			expect(result.content).toContain("Directory contents:");
			expect(result.content).toContain("file1.txt");
			expect(result.content).toContain("file2.txt");
		});

		it("should handle empty file", async () => {
			fs.writeFileSync(testFilePath, "", "utf-8");

			const result = await textEditorTool.run({
				command: "view",
				path: testFilePath,
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe("");
		});

		it("should handle view_range at end of file", async () => {
			const content = "Line 1\nLine 2\nLine 3";
			fs.writeFileSync(testFilePath, content, "utf-8");

			const result = await textEditorTool.run({
				command: "view",
				path: testFilePath,
				view_range: [2, 10], // End beyond file length
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe("Line 2\nLine 3");
		});
	});

	describe("create command", () => {
		it("should create a new file with content", async () => {
			const content = "Hello, world!";
			const result = await textEditorTool.run({
				command: "create",
				path: testFilePath,
				file_text: content,
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe("File created successfully");
			expect(fs.existsSync(testFilePath)).toBe(true);
			expect(fs.readFileSync(testFilePath, "utf-8")).toBe(content);
		});

		it("should create a new empty file when file_text is not provided", async () => {
			const result = await textEditorTool.run({
				command: "create",
				path: testFilePath,
			});

			expect(result.success).toBe(true);
			expect(fs.existsSync(testFilePath)).toBe(true);
			expect(fs.readFileSync(testFilePath, "utf-8")).toBe("");
		});

		it("should create directory structure if it does not exist", async () => {
			const nestedPath = path.join(testDir, "nested", "dir", "file.txt");
			const result = await textEditorTool.run({
				command: "create",
				path: nestedPath,
				file_text: "content",
			});

			expect(result.success).toBe(true);
			expect(fs.existsSync(nestedPath)).toBe(true);
		});

		it("should return error when file already exists", async () => {
			fs.writeFileSync(testFilePath, "existing content", "utf-8");

			const result = await textEditorTool.run({
				command: "create",
				path: testFilePath,
				file_text: "new content",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("File already exists");
			// Original content should be unchanged
			expect(fs.readFileSync(testFilePath, "utf-8")).toBe("existing content");
		});
	});

	describe("str_replace command", () => {
		it("should replace string in file", async () => {
			const originalContent = "Hello world, world is great";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "str_replace",
				path: testFilePath,
				old_str: "world",
				new_str: "universe",
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe("File updated successfully");
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("Hello universe, world is great");
		});

		it("should replace only first occurrence", async () => {
			const originalContent = "foo bar foo baz";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "str_replace",
				path: testFilePath,
				old_str: "foo",
				new_str: "qux",
			});

			expect(result.success).toBe(true);
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("qux bar foo baz");
		});

		it("should return error when old_str not found", async () => {
			fs.writeFileSync(testFilePath, "Hello world", "utf-8");

			const result = await textEditorTool.run({
				command: "str_replace",
				path: testFilePath,
				old_str: "nonexistent",
				new_str: "replacement",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("String to replace not found");
		});

		it("should return error when file does not exist", async () => {
			const result = await textEditorTool.run({
				command: "str_replace",
				path: "/nonexistent/file.txt",
				old_str: "old",
				new_str: "new",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should handle multiline string replacement", async () => {
			const originalContent = "Line 1\nLine 2\nLine 3";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "str_replace",
				path: testFilePath,
				old_str: "Line 1\nLine 2",
				new_str: "New Line 1\nNew Line 2",
			});

			expect(result.success).toBe(true);
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("New Line 1\nNew Line 2\nLine 3");
		});

		it("should handle replacing with empty string (deletion)", async () => {
			fs.writeFileSync(testFilePath, "Hello world!", "utf-8");

			const result = await textEditorTool.run({
				command: "str_replace",
				path: testFilePath,
				old_str: " world",
				new_str: "",
			});

			expect(result.success).toBe(true);
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("Hello!");
		});
	});

	describe("insert command", () => {
		it("should insert text at specified line", async () => {
			const originalContent = "Line 1\nLine 2\nLine 3";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "insert",
				path: testFilePath,
				insert_line: 2,
				new_str: "Inserted Line",
			});

			expect(result.success).toBe(true);
			expect(result.content).toBe("Text inserted successfully");
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("Line 1\nLine 2\nInserted Line\nLine 3");
		});

		it("should insert at beginning of file", async () => {
			const originalContent = "Line 1\nLine 2";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "insert",
				path: testFilePath,
				insert_line: 0,
				new_str: "First Line",
			});

			expect(result.success).toBe(true);
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("First Line\nLine 1\nLine 2");
		});

		it("should insert at end of file", async () => {
			const originalContent = "Line 1\nLine 2";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "insert",
				path: testFilePath,
				insert_line: 2,
				new_str: "Last Line",
			});

			expect(result.success).toBe(true);
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("Line 1\nLine 2\nLast Line");
		});

		it("should return error when file does not exist", async () => {
			const result = await textEditorTool.run({
				command: "insert",
				path: "/nonexistent/file.txt",
				insert_line: 1,
				new_str: "content",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should handle inserting empty string", async () => {
			const originalContent = "Line 1\nLine 2";
			fs.writeFileSync(testFilePath, originalContent, "utf-8");

			const result = await textEditorTool.run({
				command: "insert",
				path: testFilePath,
				insert_line: 1,
				new_str: "",
			});

			expect(result.success).toBe(true);
			const newContent = fs.readFileSync(testFilePath, "utf-8");
			expect(newContent).toBe("Line 1\n\nLine 2");
		});
	});

	describe("tool metadata", () => {
		it("should have correct tool type", () => {
			expect(textEditorTool.tool.type).toBe("text_editor_20250728");
		});

		it("should have correct tool name", () => {
			expect(textEditorTool.tool.name).toBe("str_replace_based_edit_tool");
		});
	});

	describe("handleView direct function", () => {
		it("should be exported and callable directly", () => {
			const content = "Test content";
			fs.writeFileSync(testFilePath, content, "utf-8");

			const result = handleView(testFilePath);
			expect(result.success).toBe(true);
			expect(result.content).toBe(content);
		});

		it("should handle view_range parameter", () => {
			const content = "Line 1\nLine 2\nLine 3";
			fs.writeFileSync(testFilePath, content, "utf-8");

			const result = handleView(testFilePath, [1, 2]);
			expect(result.success).toBe(true);
			expect(result.content).toBe("Line 1\nLine 2");
		});
	});
});
