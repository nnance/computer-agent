import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { RunnableTool } from "./types.js";

export interface Note {
	id: string;
	name: string;
	body: string;
}

class NotesManager {
	private execAsync = promisify(exec);

	async executeAppleScript(script: string) {
		try {
			const { stdout, stderr } = await this.execAsync(
				`osascript -e '${script}'`,
			);
			if (stderr) console.error("AppleScript error:", stderr);
			return stdout.trim();
		} catch (error: unknown) {
			console.error("Error executing AppleScript:", (error as Error).message);
			return null;
		}
	}

	async searchNotes(query: string): Promise<Note[] | null> {
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

		const result = await this.executeAppleScript(script);
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

	async createNote(title: string, body: string = "") {
		const script = `
      tell application "Notes"
        make new note with properties {name:"${title}", body:"${body}"}
        return "Note created: ${title}"
      end tell
    `;

		const result = await this.executeAppleScript(script);
		return result;
	}

	async editNote(noteTitle: string, newBody: string) {
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

		const result = await this.executeAppleScript(script);
		return result;
	}

	async listNotes(): Promise<Note[] | null> {
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

		const result = await this.executeAppleScript(script);
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

	async getNoteContent(noteTitle: string) {
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

		const result = await this.executeAppleScript(script);
		return result;
	}
}

const QueryInputSchema = z.object({
	query: z.string().describe("Query string to search for in notes"),
});
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const searchNotes: RunnableTool<QueryInput, Note[] | null> = {
	tool: {
		name: "searchNotes",
		description: "Search notes in the Apple Notes app by title or content.",
		input_schema: {
			type: "object",
			properties: { query: { type: "string" } },
		},
	},
	input: QueryInputSchema,
	run: async ({ query }) => {
		const manager = new NotesManager();
		const result = await manager.searchNotes(query);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No notes found or error occurred.`);
		} else {
			console.log(`Found ${result.length} note(s).`);
		}
		return result;
	},
};

const CreateInputSchema = z.object({
	title: z.string().describe("Title of the new note"),
	body: z.string().optional().describe("Body content of the new note"),
});
export type CreateInput = z.infer<typeof CreateInputSchema>;

export const createNote: RunnableTool<CreateInput, string> = {
	tool: {
		name: "createNote",
		description: "Create a new note in the Apple Notes app.",
		input_schema: {
			type: "object",
			properties: {
				title: { type: "string" },
				body: { type: "string", nullable: true },
			},
		},
	},
	input: CreateInputSchema,
	run: async ({ title, body }) => {
		const manager = new NotesManager();
		const result = await manager.createNote(title, body);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error creating note.`);
			return "Error creating note";
		}
		return result;
	},
};

const EditInputSchema = z.object({
	noteTitle: z.string().describe("Title of the note to edit"),
	newBody: z.string().describe("New body content for the note"),
});
export type EditInput = z.infer<typeof EditInputSchema>;

export const editNote: RunnableTool<EditInput, string> = {
	tool: {
		name: "editNote",
		description: "Edit an existing note in the Apple Notes app.",
		input_schema: {
			type: "object",
			properties: {
				noteTitle: { type: "string" },
				newBody: { type: "string" },
			},
		},
	},
	input: EditInputSchema,
	run: async ({ noteTitle, newBody }) => {
		const manager = new NotesManager();
		const result = await manager.editNote(noteTitle, newBody);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error editing note.`);
			return "Error editing note";
		}
		return result;
	},
};

const ListInputSchema = z.object({});
export type ListInput = z.infer<typeof ListInputSchema>;

export const listNotes: RunnableTool<ListInput, Note[] | null> = {
	tool: {
		name: "listNotes",
		description: "List all notes in the Apple Notes app.",
		input_schema: {
			type: "object",
			properties: {},
		},
	},
	input: ListInputSchema,
	run: async () => {
		const manager = new NotesManager();
		const result = await manager.listNotes();
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No notes found or error occurred.`);
		} else {
			console.log(`Found ${result.length} note(s).`);
		}
		return result;
	},
};

const GetContentInputSchema = z.object({
	noteTitle: z.string().describe("Title of the note to retrieve"),
});
export type GetContentInput = z.infer<typeof GetContentInputSchema>;

export const getNoteContent: RunnableTool<GetContentInput, string> = {
	tool: {
		name: "getNoteContent",
		description: "Get the content of a specific note by its title.",
		input_schema: {
			type: "object",
			properties: { noteTitle: { type: "string" } },
		},
	},
	input: GetContentInputSchema,
	run: async ({ noteTitle }) => {
		const manager = new NotesManager();
		const result = await manager.getNoteContent(noteTitle);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error retrieving note content.`);
			return "Error retrieving note content";
		}
		return result;
	},
};

export const appleNotesTools = [
	searchNotes,
	createNote,
	editNote,
	listNotes,
	getNoteContent,
];
