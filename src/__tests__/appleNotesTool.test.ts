import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createSearchNotes,
	createCreateNote,
	createEditNote,
	createListNotes,
	createGetNoteContent,
	searchNotes,
	createNote,
	editNote,
	listNotes,
	getNoteContent,
	NotesManager,
	type Note,
} from "../appleNotesTool.js";

// Mock NotesManager for testing
class MockNotesManager extends NotesManager {
	private mockData: {
		searchResults?: Note[] | null;
		createResult?: string | null;
		editResult?: string | null;
		listResults?: Note[] | null;
		contentResult?: string | null;
	};

	constructor(mockData = {}) {
		super();
		this.mockData = mockData;
	}

	async searchNotes(_query: string): Promise<Note[] | null> {
		return this.mockData.searchResults ?? null;
	}

	async createNote(_title: string, _body?: string): Promise<string | null> {
		return this.mockData.createResult ?? null;
	}

	async editNote(
		_noteTitle: string,
		_newBody: string,
	): Promise<string | null> {
		return this.mockData.editResult ?? null;
	}

	async listNotes(): Promise<Note[] | null> {
		return this.mockData.listResults ?? null;
	}

	async getNoteContent(_noteTitle: string): Promise<string | null> {
		return this.mockData.contentResult ?? null;
	}
}

describe("appleNotesTool", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
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
			const mockNotes: Note[] = [
				{ id: "id1", name: "Note 1", body: "Body 1" },
				{ id: "id2", name: "Note 2", body: "Body 2" },
			];

			const mockManager = new MockNotesManager({
				searchResults: mockNotes,
			});
			const tool = createSearchNotes(mockManager);

			const result = await tool.run({ query: "test" });

			expect(result).toEqual(mockNotes);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 note(s).");
		});

		it("should return single note", async () => {
			const mockNote: Note[] = [
				{ id: "id1", name: "Note 1", body: "Body 1" },
			];

			const mockManager = new MockNotesManager({
				searchResults: mockNote,
			});
			const tool = createSearchNotes(mockManager);

			const result = await tool.run({ query: "test" });

			expect(result).toEqual(mockNote);
		});

		it("should return null when AppleScript fails", async () => {
			const mockManager = new MockNotesManager({
				searchResults: null,
			});
			const tool = createSearchNotes(mockManager);

			const result = await tool.run({ query: "test" });

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});

		it("should handle empty search results", async () => {
			const mockManager = new MockNotesManager({
				searchResults: null,
			});
			const tool = createSearchNotes(mockManager);

			const result = await tool.run({ query: "nonexistent" });

			expect(result).toBeNull();
		});

		it("should escape special characters in query", async () => {
			const mockNotes: Note[] = [];
			const mockManager = new MockNotesManager({
				searchResults: mockNotes,
			});
			const tool = createSearchNotes(mockManager);

			await tool.run({ query: "test's note" });

			// This test is mainly to ensure no errors are thrown
		});
	});

	describe("createNote", () => {
		it("should create note with title and body", async () => {
			const mockManager = new MockNotesManager({
				createResult: "Note created: Test Note",
			});
			const tool = createCreateNote(mockManager);

			const result = await tool.run({
				title: "Test Note",
				body: "Test body",
			});

			expect(result).toBe("Note created: Test Note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should create note with only title", async () => {
			const mockManager = new MockNotesManager({
				createResult: "Note created: Test Note",
			});
			const tool = createCreateNote(mockManager);

			const result = await tool.run({ title: "Test Note" });

			expect(result).toBe("Note created: Test Note");
		});

		it("should return error message when creation fails", async () => {
			const mockManager = new MockNotesManager({
				createResult: null,
			});
			const tool = createCreateNote(mockManager);

			const result = await tool.run({ title: "Test Note" });

			expect(result).toBe("Error creating note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("editNote", () => {
		it("should edit existing note", async () => {
			const mockManager = new MockNotesManager({
				editResult: "Note updated: Test Note",
			});
			const tool = createEditNote(mockManager);

			const result = await tool.run({
				noteTitle: "Test Note",
				newBody: "Updated body",
			});

			expect(result).toBe("Note updated: Test Note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should return not found message", async () => {
			const mockManager = new MockNotesManager({
				editResult: "Note not found: Nonexistent Note",
			});
			const tool = createEditNote(mockManager);

			const result = await tool.run({
				noteTitle: "Nonexistent Note",
				newBody: "Body",
			});

			expect(result).toBe("Note not found: Nonexistent Note");
		});

		it("should return error message when edit fails", async () => {
			const mockManager = new MockNotesManager({
				editResult: null,
			});
			const tool = createEditNote(mockManager);

			const result = await tool.run({
				noteTitle: "Test Note",
				newBody: "Body",
			});

			expect(result).toBe("Error editing note");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("listNotes", () => {
		it("should list all notes", async () => {
			const mockNotes: Note[] = [
				{ id: "id1", name: "Note 1", body: "Body 1" },
				{ id: "id2", name: "Note 2", body: "Body 2" },
				{ id: "id3", name: "Note 3", body: "Body 3" },
			];

			const mockManager = new MockNotesManager({
				listResults: mockNotes,
			});
			const tool = createListNotes(mockManager);

			const result = await tool.run({});

			expect(result).toEqual(mockNotes);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 3 note(s).");
		});

		it("should return null when no notes found", async () => {
			const mockManager = new MockNotesManager({
				listResults: null,
			});
			const tool = createListNotes(mockManager);

			const result = await tool.run({});

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});

		it("should handle AppleScript errors", async () => {
			const mockManager = new MockNotesManager({
				listResults: null,
			});
			const tool = createListNotes(mockManager);

			const result = await tool.run({});

			expect(result).toBeNull();
		});
	});

	describe("getNoteContent", () => {
		it("should get note content", async () => {
			const mockManager = new MockNotesManager({
				contentResult: "This is the note body content",
			});
			const tool = createGetNoteContent(mockManager);

			const result = await tool.run({ noteTitle: "Test Note" });

			expect(result).toBe("This is the note body content");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should return not found message", async () => {
			const mockManager = new MockNotesManager({
				contentResult: "Note not found: Nonexistent Note",
			});
			const tool = createGetNoteContent(mockManager);

			const result = await tool.run({
				noteTitle: "Nonexistent Note",
			});

			expect(result).toBe("Note not found: Nonexistent Note");
		});

		it("should return error message when retrieval fails", async () => {
			const mockManager = new MockNotesManager({
				contentResult: null,
			});
			const tool = createGetNoteContent(mockManager);

			const result = await tool.run({ noteTitle: "Test Note" });

			expect(result).toBe("Error retrieving note content");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});

		it("should handle empty note content", async () => {
			const mockManager = new MockNotesManager({
				contentResult: null,
			});
			const tool = createGetNoteContent(mockManager);

			const result = await tool.run({ noteTitle: "Empty Note" });

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
