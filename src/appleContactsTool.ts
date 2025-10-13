import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { RunnableTool } from "./types.js";

export interface Contact {
	id: string;
	name: string;
	emails: string[];
	phones: string[];
	organization?: string;
	birthday?: string;
}

class ContactsManager {
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

	async searchContacts(query: string): Promise<Contact[] | null> {
		const script = `
      tell application "Contacts"
        set searchResults to ""
        repeat with p in people
          if (name of p contains "${query}") or (organization of p contains "${query}") then
            if searchResults is not "" then
              set searchResults to searchResults & ":::"
            end if
            set contactInfo to (id of p) & "|||" & (name of p) & "|||"
            set emailList to ""
            repeat with e in emails of p
              if emailList is not "" then
                set emailList to emailList & ","
              end if
              set emailList to emailList & (value of e)
            end repeat
            set contactInfo to contactInfo & emailList & "|||"
            set phoneList to ""
            repeat with ph in phones of p
              if phoneList is not "" then
                set phoneList to phoneList & ","
              end if
              set phoneList to phoneList & (value of ph)
            end repeat
            set contactInfo to contactInfo & phoneList & "|||" & (organization of p) & "|||"
            try
              set birthdayValue to birth date of p
              set contactInfo to contactInfo & (birthdayValue as string)
            on error
              set contactInfo to contactInfo & ""
            end try
            set searchResults to searchResults & contactInfo
          end if
        end repeat
        return searchResults
      end tell
    `;

		const result = await this.executeAppleScript(script);
		if (result) {
			const contactStrings = result.split(":::");
			const contacts: Contact[] = contactStrings.map((contactStr) => {
				const [id, name, emailsStr, phonesStr, organization, birthday] =
					contactStr.split("|||");
				return {
					id,
					name,
					emails: emailsStr ? emailsStr.split(",") : [],
					phones: phonesStr ? phonesStr.split(",") : [],
					organization: organization || undefined,
					birthday: birthday || undefined,
				} as Contact;
			});
			return contacts;
		}
		return null;
	}

	async createContact(
		name: string,
		email?: string,
		phone?: string,
		organization?: string,
		birthday?: string,
	) {
		const script = `
      tell application "Contacts"
        set newPerson to make new person with properties {name:"${name}"${organization ? `, organization:"${organization}"` : ""}}
        ${email ? `make new email at end of emails of newPerson with properties {value:"${email}"}` : ""}
        ${phone ? `make new phone at end of phones of newPerson with properties {value:"${phone}"}` : ""}
        ${birthday ? `set birth date of newPerson to date "${birthday}"` : ""}
        save
        return "Contact created: ${name}"
      end tell
    `;

		const result = await this.executeAppleScript(script);
		return result;
	}

	async listContacts(): Promise<Contact[] | null> {
		const script = `
      tell application "Contacts"
        set contactList to ""
        repeat with p in people
          if contactList is not "" then
            set contactList to contactList & ":::"
          end if
          set contactInfo to (id of p) & "|||" & (name of p) & "|||"
          set emailList to ""
          repeat with e in emails of p
            if emailList is not "" then
              set emailList to emailList & ","
            end if
            set emailList to emailList & (value of e)
          end repeat
          set contactInfo to contactInfo & emailList & "|||"
          set phoneList to ""
          repeat with ph in phones of p
            if phoneList is not "" then
              set phoneList to phoneList & ","
            end if
            set phoneList to phoneList & (value of ph)
          end repeat
          set contactInfo to contactInfo & phoneList & "|||" & (organization of p) & "|||"
          try
            set birthdayValue to birth date of p
            set contactInfo to contactInfo & (birthdayValue as string)
          on error
            set contactInfo to contactInfo & ""
          end try
          set contactList to contactList & contactInfo
        end repeat
        return contactList
      end tell
    `;

		const result = await this.executeAppleScript(script);
		if (result) {
			const contactStrings = result.split(":::");
			const contacts: Contact[] = contactStrings.map((contactStr) => {
				const [id, name, emailsStr, phonesStr, organization, birthday] =
					contactStr.split("|||");
				return {
					id,
					name,
					emails: emailsStr ? emailsStr.split(",") : [],
					phones: phonesStr ? phonesStr.split(",") : [],
					organization: organization || undefined,
					birthday: birthday || undefined,
				} as Contact;
			});
			return contacts;
		}
		return null;
	}

	async getContact(contactName: string): Promise<Contact | null> {
		const script = `
      tell application "Contacts"
        repeat with p in people
          if name of p is "${contactName}" then
            set contactInfo to (id of p) & "|||" & (name of p) & "|||"
            set emailList to ""
            repeat with e in emails of p
              if emailList is not "" then
                set emailList to emailList & ","
              end if
              set emailList to emailList & (value of e)
            end repeat
            set contactInfo to contactInfo & emailList & "|||"
            set phoneList to ""
            repeat with ph in phones of p
              if phoneList is not "" then
                set phoneList to phoneList & ","
              end if
              set phoneList to phoneList & (value of ph)
            end repeat
            set contactInfo to contactInfo & phoneList & "|||" & (organization of p) & "|||"
            try
              set birthdayValue to birth date of p
              set contactInfo to contactInfo & (birthdayValue as string)
            on error
              set contactInfo to contactInfo & ""
            end try
            return contactInfo
          end if
        end repeat
        return "Contact not found: ${contactName}"
      end tell
    `;

		const result = await this.executeAppleScript(script);
		if (result && !result.includes("Contact not found")) {
			const [id, name, emailsStr, phonesStr, organization, birthday] =
				result.split("|||");
			return {
				id,
				name,
				emails: emailsStr ? emailsStr.split(",") : [],
				phones: phonesStr ? phonesStr.split(",") : [],
				organization: organization || undefined,
				birthday: birthday || undefined,
			} as Contact;
		}
		return null;
	}
}

const SearchContactsInputSchema = z.object({
	query: z.string().describe("Query string to search for in contacts"),
});
export type SearchContactsInput = z.infer<typeof SearchContactsInputSchema>;

export const searchContacts: RunnableTool<
	SearchContactsInput,
	Contact[] | null
> = {
	tool: {
		name: "searchContacts",
		description:
			"Search contacts in the Apple Contacts app by name or organization.",
		input_schema: {
			type: "object",
			properties: { query: { type: "string" } },
		},
	},
	input: SearchContactsInputSchema,
	run: async ({ query }) => {
		const manager = new ContactsManager();
		const result = await manager.searchContacts(query);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No contacts found or error occurred.`);
		} else {
			console.log(`Found ${result.length} contact(s).`);
		}
		return result;
	},
};

const CreateContactInputSchema = z.object({
	name: z.string().describe("Name of the new contact"),
	email: z.string().optional().describe("Email address of the contact"),
	phone: z.string().optional().describe("Phone number of the contact"),
	organization: z.string().optional().describe("Organization of the contact"),
	birthday: z
		.string()
		.optional()
		.describe(
			"Birthday of the contact in a format AppleScript understands (e.g., 'January 15, 1990')",
		),
});
export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

export const createContact: RunnableTool<CreateContactInput, string> = {
	tool: {
		name: "createContact",
		description: "Create a new contact in the Apple Contacts app.",
		input_schema: {
			type: "object",
			properties: {
				name: { type: "string" },
				email: { type: "string", nullable: true },
				phone: { type: "string", nullable: true },
				organization: { type: "string", nullable: true },
				birthday: { type: "string", nullable: true },
			},
		},
	},
	input: CreateContactInputSchema,
	run: async ({ name, email, phone, organization, birthday }) => {
		const manager = new ContactsManager();
		const result = await manager.createContact(
			name,
			email,
			phone,
			organization,
			birthday,
		);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error creating contact.`);
			return "Error creating contact";
		}
		return result;
	},
};

const ListContactsInputSchema = z.object({});
export type ListContactsInput = z.infer<typeof ListContactsInputSchema>;

export const listContacts: RunnableTool<ListContactsInput, Contact[] | null> = {
	tool: {
		name: "listContacts",
		description: "List all contacts in the Apple Contacts app.",
		input_schema: {
			type: "object",
			properties: {},
		},
	},
	input: ListContactsInputSchema,
	run: async () => {
		const manager = new ContactsManager();
		const result = await manager.listContacts();
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No contacts found or error occurred.`);
		} else {
			console.log(`Found ${result.length} contact(s).`);
		}
		return result;
	},
};

const GetContactInputSchema = z.object({
	contactName: z.string().describe("Name of the contact to retrieve"),
});
export type GetContactInput = z.infer<typeof GetContactInputSchema>;

export const getContact: RunnableTool<GetContactInput, Contact | null> = {
	tool: {
		name: "getContact",
		description: "Get a specific contact by name from the Apple Contacts app.",
		input_schema: {
			type: "object",
			properties: { contactName: { type: "string" } },
		},
	},
	input: GetContactInputSchema,
	run: async ({ contactName }) => {
		const manager = new ContactsManager();
		const result = await manager.getContact(contactName);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: Contact not found or error occurred.`);
			return null;
		}
		return result;
	},
};

export const appleContactsTools = [
	searchContacts,
	createContact,
	listContacts,
	getContact,
];
