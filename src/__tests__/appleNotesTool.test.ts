import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	searchNotes,
	createNote,
	editNote,
	listNotes,
	getNoteContent,
	type Note,
} from "../appleNotesTool.js";
import * as cp from "node:child_process";

// Mock child_process
vi.mock("node:child_process", () => ({
	exec: vi.fn(),
}));

describe("appleNotesTool", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe("Zod input validation", () => {
		describe("searchNotes", () => {
			it("should validate correct input", () => {
				const input = { query: "test" };
				const result = searchNotes.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing query", () => {
				const input = {};
				const result = searchNotes.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("createNote", () => {
			it("should validate correct input with title and body", () => {
				const input = { title: "Test Note", body: "Test body" };
				const result = createNote.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input with only title", () => {
				const input = { title: "Test Note" };
				const result = createNote.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing title", () => {
				const input = { body: "Test body" };
				const result = createNote.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("editNote", () => {
			it("should validate correct input", () => {
				const input = { noteTitle: "Test Note", newBody: "New body" };
				const result = editNote.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing noteTitle", () => {
				const input = { newBody: "New body" };
				const result = editNote.input.safeParse(input);
				expect(result.success).toBe(false);
			});

			it("should reject missing newBody", () => {
				const input = { noteTitle: "Test Note" };
				const result = editNote.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("listNotes", () => {
			it("should validate empty input", () => {
				const input = {};
				const result = listNotes.input.safeParse(input);
				expect(result.success).toBe(true);
			});
		});

		describe("getNoteContent", () => {
			it("should validate correct input", () => {
				const input = { noteTitle: "Test Note" };
				const result = getNoteContent.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing noteTitle", () => {
				const input = {};
				const result = getNoteContent.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});
	});

	describe("searchNotes", () => {
		it("should search notes and return results", async () => {
			const mockOutput =
				"id1|||Note 1|||Body 1:::id2|||Note 2|||Body 2";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchNotes.run({ query: "test" });

			expect(result).toEqual([
				{ id: "id1", name: "Note 1", body: "Body 1" },
				{ id: "id2", name: "Note 2", body: "Body 2" },
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 note(s).");
		});

		it("should return single note", async () => {
			const mockOutput = "id1|||Note 1|||Body 1";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchNotes.run({ query: "test" });

			expect(result).toEqual([{ id: "id1", name: "Note 1", body: "Body 1" }]);
		});

		it("should return null when AppleScript fails", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(
					new Error("AppleScript error"),
					{ stdout: "", stderr: "" } as any,
					"",
				);
				return {} as any;
			});

			const result = await searchNotes.run({ query: "test" });

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it("should handle empty search results", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchNotes.run({ query: "nonexistent" });

			expect(result).toBeNull();
		});

		it("should escape special characters in query", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				expect(cmd).toContain("test's note");
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			await searchNotes.run({ query: "test's note" });
		});
	});

	describe("createNote", () => {
		it("should create note with title and body", async () => {
			const mockOutput = "Note created: Test Note";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createNote.run({
				title: "Test Note",
				body: "Test body",
			});

			expect(result).toBe("Note created: Test Note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should create note with only title", async () => {
			const mockOutput = "Note created: Test Note";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createNote.run({ title: "Test Note" });

			expect(result).toBe("Note created: Test Note");
		});

		it("should return error message when creation fails", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(
					new Error("Creation failed"),
					{ stdout: "", stderr: "" } as any,
					"",
				);
				return {} as any;
			});

			const result = await createNote.run({ title: "Test Note" });

			expect(result).toBe("Error creating note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("editNote", () => {
		it("should edit existing note", async () => {
			const mockOutput = "Note updated: Test Note";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await editNote.run({
				noteTitle: "Test Note",
				newBody: "Updated body",
			});

			expect(result).toBe("Note updated: Test Note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should return not found message", async () => {
			const mockOutput = "Note not found: Nonexistent Note";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await editNote.run({
				noteTitle: "Nonexistent Note",
				newBody: "Body",
			});

			expect(result).toBe("Note not found: Nonexistent Note");
		});

		it("should return error message when edit fails", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(
					new Error("Edit failed"),
					{ stdout: "", stderr: "" } as any,
					"",
				);
				return {} as any;
			});

			const result = await editNote.run({
				noteTitle: "Test Note",
				newBody: "Body",
			});

			expect(result).toBe("Error editing note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("listNotes", () => {
		it("should list all notes", async () => {
			const mockOutput =
				"id1|||Note 1|||Body 1:::id2|||Note 2|||Body 2:::id3|||Note 3|||Body 3";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listNotes.run({});

			expect(result).toEqual([
				{ id: "id1", name: "Note 1", body: "Body 1" },
				{ id: "id2", name: "Note 2", body: "Body 2" },
				{ id: "id3", name: "Note 3", body: "Body 3" },
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 3 note(s).");
		});

		it("should return null when no notes found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listNotes.run({});

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});

		it("should handle AppleScript errors", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(
					new Error("AppleScript error"),
					{ stdout: "", stderr: "" } as any,
					"",
				);
				return {} as any;
			});

			const result = await listNotes.run({});

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("getNoteContent", () => {
		it("should get note content", async () => {
			const mockOutput = "This is the note body content";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getNoteContent.run({ noteTitle: "Test Note" });

			expect(result).toBe("This is the note body content");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should return not found message", async () => {
			const mockOutput = "Note not found: Nonexistent Note";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getNoteContent.run({
				noteTitle: "Nonexistent Note",
			});

			expect(result).toBe("Note not found: Nonexistent Note");
		});

		it("should return error message when retrieval fails", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(
					new Error("Retrieval failed"),
					{ stdout: "", stderr: "" } as any,
					"",
				);
				return {} as any;
			});

			const result = await getNoteContent.run({ noteTitle: "Test Note" });

			expect(result).toBe("Error retrieving note content");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});

		it("should handle empty note content", async () => {
			const mockOutput = "";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getNoteContent.run({ noteTitle: "Empty Note" });

			expect(result).toBe("Error retrieving note content");
		});
	});

	describe("tool metadata", () => {
		it("searchNotes should have correct name", () => {
			expect(searchNotes.tool.name).toBe("searchNotes");
		});

		it("createNote should have correct name", () => {
			expect(createNote.tool.name).toBe("createNote");
		});

		it("editNote should have correct name", () => {
			expect(editNote.tool.name).toBe("editNote");
		});

		it("listNotes should have correct name", () => {
			expect(listNotes.tool.name).toBe("listNotes");
		});

		it("getNoteContent should have correct name", () => {
			expect(getNoteContent.tool.name).toBe("getNoteContent");
		});
	});
});
