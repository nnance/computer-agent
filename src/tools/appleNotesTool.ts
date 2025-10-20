import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { OutputHandler } from "../helpers/outputHandler.js";
import { createRunnableTool } from "./types.js";

export interface Note {
	id: string;
	name: string;
	body: string;
}

export class NotesManager {
	private execAsync = promisify(exec);

	async executeAppleScript(script: string, output?: OutputHandler) {
		try {
			const { stdout, stderr } = await this.execAsync(
				`osascript -e '${script}'`,
			);
			if (stderr) output?.showDebug(`AppleScript error: ${stderr}`, "error");
			return stdout.trim();
		} catch (error: unknown) {
			output?.showError(
				`Error executing AppleScript: ${(error as Error).message}`,
			);
			return null;
		}
	}

	async searchNotes(
		query: string,
		output?: OutputHandler,
	): Promise<Note[] | null> {
		const script = `
      tell application "Notes"
        set searchResults to ""
        repeat with n in notes
          if (name of n contains "${query}") or (body of n contains "${query}") then
            if searchResults is not "" then
              set searchResults to searchResults & ":::"
            end if
            set searchResults to searchResults & (id of n) & "|||" & (name of n) & "|||" & (body of n)
          end if
        end repeat
        return searchResults
      end tell
    `;

		const result = await this.executeAppleScript(script, output);
		if (result) {
			const noteStrings = result.split(":::");
			const notes: Note[] = noteStrings.map((noteStr) => {
				const [id, name, body] = noteStr.split("|||");
				return { id, name, body } as Note;
			});
			return notes;
		}
		return null;
	}

	async createNote(title: string, body: string = "", output?: OutputHandler) {
		const script = `
      tell application "Notes"
        make new note with properties {name:"${title}", body:"${body}"}
        return "Note created: ${title}"
      end tell
    `;

		const result = await this.executeAppleScript(script, output);
		return result;
	}

	async editNote(noteTitle: string, newBody: string, output?: OutputHandler) {
		const script = `
      tell application "Notes"
        repeat with n in notes
          if name of n is "${noteTitle}" then
            set body of n to "${newBody}"
            return "Note updated: ${noteTitle}"
          end if
        end repeat
        return "Note not found: ${noteTitle}"
      end tell
    `;

		const result = await this.executeAppleScript(script, output);
		return result;
	}

	async listNotes(output?: OutputHandler): Promise<Note[] | null> {
		const script = `
      tell application "Notes"
        set noteList to ""
        repeat with n in notes
          if noteList is not "" then
            set noteList to noteList & ":::"
          end if
          set noteList to noteList & (id of n) & "|||" & (name of n) & "|||" & (body of n)
        end repeat
        return noteList
      end tell
    `;

		const result = await this.executeAppleScript(script, output);
		if (result) {
			const noteStrings = result.split(":::");
			const notes: Note[] = noteStrings.map((noteStr) => {
				const [id, name, body] = noteStr.split("|||");
				return { id, name, body } as Note;
			});
			return notes;
		}
		return null;
	}

	async getNoteContent(noteTitle: string, output?: OutputHandler) {
		const script = `
      tell application "Notes"
        repeat with n in notes
          if name of n is "${noteTitle}" then
            return body of n
          end if
        end repeat
        return "Note not found: ${noteTitle}"
      end tell
    `;

		const result = await this.executeAppleScript(script, output);
		return result;
	}
}

const QueryInputSchema = z.object({
	query: z.string().describe("Query string to search for in notes"),
});
export type QueryInput = z.infer<typeof QueryInputSchema>;

export function createSearchNotes(manager?: NotesManager) {
	const notesManager = manager || new NotesManager();

	return createRunnableTool({
		name: "searchNotes",
		description: "Search notes in the Apple Notes app by title or content.",
		schema: QueryInputSchema,
		run: async ({ query }, output) => {
			const result = await notesManager.searchNotes(query, output);
			output?.showDebug(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
			if (!result) {
				output?.showDebug(`Error: No notes found or error occurred.`, "error");
			} else {
				output?.showDebug(`Found ${result.length} note(s).`);
			}
			return result;
		},
	});
}

export const searchNotes = createSearchNotes();

const CreateInputSchema = z.object({
	title: z.string().describe("Title of the new note"),
	body: z.string().optional().describe("Body content of the new note"),
});
export type CreateInput = z.infer<typeof CreateInputSchema>;

export function createCreateNote(manager?: NotesManager) {
	const notesManager = manager || new NotesManager();

	return createRunnableTool({
		name: "createNote",
		description: "Create a new note in the Apple Notes app.",
		schema: CreateInputSchema,
		run: async ({ title, body }, output) => {
			const result = await notesManager.createNote(title, body, output);
			output?.showDebug(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
			if (!result) {
				output?.showDebug(`Error creating note.`, "error");
				return "Error creating note";
			}
			return result;
		},
	});
}

export const createNote = createCreateNote();

const EditInputSchema = z.object({
	noteTitle: z.string().describe("Title of the note to edit"),
	newBody: z.string().describe("New body content for the note"),
});
export type EditInput = z.infer<typeof EditInputSchema>;

export function createEditNote(manager?: NotesManager) {
	const notesManager = manager || new NotesManager();

	return createRunnableTool({
		name: "editNote",
		description: "Edit an existing note in the Apple Notes app.",
		schema: EditInputSchema,
		run: async ({ noteTitle, newBody }, output) => {
			const result = await notesManager.editNote(noteTitle, newBody, output);
			output?.showDebug(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
			if (!result) {
				output?.showDebug(`Error editing note.`, "error");
				return "Error editing note";
			}
			return result;
		},
	});
}

export const editNote = createEditNote();

const ListInputSchema = z.object({});
export type ListInput = z.infer<typeof ListInputSchema>;

export function createListNotes(manager?: NotesManager) {
	const notesManager = manager || new NotesManager();

	return createRunnableTool({
		name: "listNotes",
		description: "List all notes in the Apple Notes app.",
		schema: ListInputSchema,
		run: async (_, output) => {
			const result = await notesManager.listNotes(output);
			output?.showDebug(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
			if (!result) {
				output?.showDebug(`Error: No notes found or error occurred.`, "error");
			} else {
				output?.showDebug(`Found ${result.length} note(s).`);
			}
			return result;
		},
	});
}

export const listNotes = createListNotes();

const GetContentInputSchema = z.object({
	noteTitle: z.string().describe("Title of the note to retrieve"),
});
export type GetContentInput = z.infer<typeof GetContentInputSchema>;

export function createGetNoteContent(manager?: NotesManager) {
	const notesManager = manager || new NotesManager();

	return createRunnableTool({
		name: "getNoteContent",
		description: "Get the content of a specific note by its title.",
		schema: GetContentInputSchema,
		run: async ({ noteTitle }, output) => {
			const result = await notesManager.getNoteContent(noteTitle, output);
			output?.showDebug(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
			if (!result) {
				output?.showDebug(`Error retrieving note content.`, "error");
				return "Error retrieving note content";
			}
			return result;
		},
	});
}

export const getNoteContent = createGetNoteContent();

export const appleNotesTools = [
	searchNotes,
	createNote,
	editNote,
	listNotes,
	getNoteContent,
];
