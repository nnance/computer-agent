import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type Contact,
	ContactsManager,
	createContact,
	createCreateContact,
	createGetContact,
	createListContacts,
	createSearchContacts,
	getContact,
	listContacts,
	searchContacts,
} from "../tools/appleContactsTool.js";

// Mock ContactsManager for testing
class MockContactsManager extends ContactsManager {
	private mockData: {
		searchResults?: Contact[] | null;
		createResult?: string | null;
		listResults?: Contact[] | null;
		getResult?: Contact | null;
	};

	constructor(mockData = {}) {
		super();
		this.mockData = mockData;
	}

	async searchContacts(_query: string): Promise<Contact[] | null> {
		return this.mockData.searchResults ?? null;
	}

	async createContact(
		_name: string,
		_email?: string,
		_phone?: string,
		_organization?: string,
		_birthday?: string,
	): Promise<string | null> {
		return this.mockData.createResult ?? null;
	}

	async listContacts(): Promise<Contact[] | null> {
		return this.mockData.listResults ?? null;
	}

	async getContact(_contactName: string): Promise<Contact | null> {
		return this.mockData.getResult ?? null;
	}
}

// Mock OutputHandler for testing
const mockOutput = {
	startThinking: vi.fn(),
	stopThinking: vi.fn(),
	startTool: vi.fn(),
	stopTool: vi.fn(),
	showMessage: vi.fn(),
	showSuccess: vi.fn(),
	showError: vi.fn(),
	showDebug: vi.fn(),
	showHelp: vi.fn(),
};

describe("appleContactsTool", () => {
	beforeEach(() => {
		// Reset all mock function calls before each test
		vi.clearAllMocks();
	});

	describe("Zod input validation", () => {
		describe("searchContacts", () => {
			it("should validate correct input", () => {
				const input = { query: "John" };
				const result = searchContacts.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing query", () => {
				const input = {};
				const result = searchContacts.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("createContact", () => {
			it("should validate input with all parameters", () => {
				const input = {
					name: "John Doe",
					email: "john@example.com",
					phone: "555-1234",
					organization: "Acme Corp",
					birthday: "January 15, 1990",
				};
				const result = createContact.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input with only name", () => {
				const input = { name: "John Doe" };
				const result = createContact.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing name", () => {
				const input = { email: "john@example.com" };
				const result = createContact.input.safeParse(input);
				expect(result.success).toBe(false);
			});

			it("should validate input with name and email only", () => {
				const input = { name: "John Doe", email: "john@example.com" };
				const result = createContact.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input with name and phone only", () => {
				const input = { name: "John Doe", phone: "555-1234" };
				const result = createContact.input.safeParse(input);
				expect(result.success).toBe(true);
			});
		});

		describe("listContacts", () => {
			it("should validate empty input", () => {
				const input = {};
				const result = listContacts.input.safeParse(input);
				expect(result.success).toBe(true);
			});
		});

		describe("getContact", () => {
			it("should validate correct input", () => {
				const input = { contactName: "John Doe" };
				const result = getContact.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing contactName", () => {
				const input = {};
				const result = getContact.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});
	});

	describe("searchContacts", () => {
		it("should search contacts and return results", async () => {
			const mockContacts: Contact[] = [
				{
					id: "id1",
					name: "John Doe",
					emails: ["john@example.com", "john.doe@work.com"],
					phones: ["555-1234", "555-5678"],
					organization: "Acme Corp",
					birthday: "January 15, 1990",
				},
				{
					id: "id2",
					name: "Jane Smith",
					emails: ["jane@example.com"],
					phones: ["555-9999"],
					organization: "Tech Inc",
					birthday: undefined,
				},
			];

			const mockManager = new MockContactsManager({
				searchResults: mockContacts,
			});
			const tool = createSearchContacts(mockManager);

			const result = await tool.run({ query: "John" }, mockOutput);

			expect(result).toEqual(mockContacts);
		});

		it("should handle contact with no emails or phones", async () => {
			const mockContact: Contact[] = [
				{
					id: "id1",
					name: "John Doe",
					emails: [],
					phones: [],
					organization: undefined,
					birthday: undefined,
				},
			];

			const mockManager = new MockContactsManager({
				searchResults: mockContact,
			});
			const tool = createSearchContacts(mockManager);

			const result = await tool.run({ query: "John" }, mockOutput);

			expect(result).toEqual(mockContact);
		});

		it("should return null when no contacts found", async () => {
			const mockManager = new MockContactsManager({
				searchResults: null,
			});
			const tool = createSearchContacts(mockManager);

			const result = await tool.run({ query: "nonexistent" }, mockOutput);

			expect(result).toBeNull();
		});

		it("should handle AppleScript errors", async () => {
			const mockManager = new MockContactsManager({
				searchResults: null,
			});
			const tool = createSearchContacts(mockManager);

			const result = await tool.run({ query: "test" }, mockOutput);

			expect(result).toBeNull();
		});

		it("should search by organization", async () => {
			const mockContact: Contact[] = [
				{
					id: "id1",
					name: "John Doe",
					emails: ["john@example.com"],
					phones: ["555-1234"],
					organization: "Acme Corp",
					birthday: undefined,
				},
			];

			const mockManager = new MockContactsManager({
				searchResults: mockContact,
			});
			const tool = createSearchContacts(mockManager);

			const result = await tool.run({ query: "Acme" }, mockOutput);

			expect(result).toEqual(mockContact);
		});
	});

	describe("createContact", () => {
		it("should create contact with all parameters", async () => {
			const mockManager = new MockContactsManager({
				createResult: "Contact created: John Doe",
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run(
				{
					name: "John Doe",
					email: "john@example.com",
					phone: "555-1234",
					organization: "Acme Corp",
					birthday: "January 15, 1990",
				},
				mockOutput,
			);

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with only name", async () => {
			const mockManager = new MockContactsManager({
				createResult: "Contact created: John Doe",
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run({ name: "John Doe" }, mockOutput);

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and email", async () => {
			const mockManager = new MockContactsManager({
				createResult: "Contact created: John Doe",
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run(
				{
					name: "John Doe",
					email: "john@example.com",
				},
				mockOutput,
			);

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and phone", async () => {
			const mockManager = new MockContactsManager({
				createResult: "Contact created: John Doe",
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run(
				{
					name: "John Doe",
					phone: "555-1234",
				},
				mockOutput,
			);

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and organization", async () => {
			const mockManager = new MockContactsManager({
				createResult: "Contact created: John Doe",
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run(
				{
					name: "John Doe",
					organization: "Acme Corp",
				},
				mockOutput,
			);

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and birthday", async () => {
			const mockManager = new MockContactsManager({
				createResult: "Contact created: John Doe",
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run(
				{
					name: "John Doe",
					birthday: "January 15, 1990",
				},
				mockOutput,
			);

			expect(result).toBe("Contact created: John Doe");
		});

		it("should return error message when creation fails", async () => {
			const mockManager = new MockContactsManager({
				createResult: null,
			});
			const tool = createCreateContact(mockManager);

			const result = await tool.run({ name: "John Doe" }, mockOutput);

			expect(result).toBe("Error creating contact");
		});
	});

	describe("listContacts", () => {
		it("should list all contacts", async () => {
			const mockContacts: Contact[] = [
				{
					id: "id1",
					name: "John Doe",
					emails: ["john@example.com"],
					phones: ["555-1234"],
					organization: "Acme Corp",
					birthday: "January 15, 1990",
				},
				{
					id: "id2",
					name: "Jane Smith",
					emails: ["jane@example.com"],
					phones: ["555-9999"],
					organization: "Tech Inc",
					birthday: undefined,
				},
				{
					id: "id3",
					name: "Bob Johnson",
					emails: [],
					phones: [],
					organization: undefined,
					birthday: undefined,
				},
			];

			const mockManager = new MockContactsManager({
				listResults: mockContacts,
			});
			const tool = createListContacts(mockManager);

			const result = await tool.run({}, mockOutput);

			expect(result).toEqual(mockContacts);
		});

		it("should handle contacts with multiple emails and phones", async () => {
			const mockContacts: Contact[] = [
				{
					id: "id1",
					name: "John Doe",
					emails: [
						"john@example.com",
						"john.doe@work.com",
						"john.personal@mail.com",
					],
					phones: ["555-1234", "555-5678", "555-0000"],
					organization: "Acme Corp",
					birthday: undefined,
				},
			];

			const mockManager = new MockContactsManager({
				listResults: mockContacts,
			});
			const tool = createListContacts(mockManager);

			const result = await tool.run({}, mockOutput);

			expect(result).toEqual(mockContacts);
		});

		it("should return null when no contacts found", async () => {
			const mockManager = new MockContactsManager({
				listResults: null,
			});
			const tool = createListContacts(mockManager);

			const result = await tool.run({}, mockOutput);

			expect(result).toBeNull();
		});

		it("should handle AppleScript errors", async () => {
			const mockManager = new MockContactsManager({
				listResults: null,
			});
			const tool = createListContacts(mockManager);

			const result = await tool.run({}, mockOutput);

			expect(result).toBeNull();
		});
	});

	describe("getContact", () => {
		it("should get contact by name", async () => {
			const mockContact: Contact = {
				id: "id1",
				name: "John Doe",
				emails: ["john@example.com", "john.doe@work.com"],
				phones: ["555-1234", "555-5678"],
				organization: "Acme Corp",
				birthday: "January 15, 1990",
			};

			const mockManager = new MockContactsManager({
				getResult: mockContact,
			});
			const tool = createGetContact(mockManager);

			const result = await tool.run({ contactName: "John Doe" }, mockOutput);

			expect(result).toEqual(mockContact);
		});

		it("should get contact with minimal information", async () => {
			const mockContact: Contact = {
				id: "id1",
				name: "John Doe",
				emails: [],
				phones: [],
				organization: undefined,
				birthday: undefined,
			};

			const mockManager = new MockContactsManager({
				getResult: mockContact,
			});
			const tool = createGetContact(mockManager);

			const result = await tool.run({ contactName: "John Doe" }, mockOutput);

			expect(result).toEqual(mockContact);
		});

		it("should return null when contact not found", async () => {
			const mockManager = new MockContactsManager({
				getResult: null,
			});
			const tool = createGetContact(mockManager);

			const result = await tool.run(
				{
					contactName: "Nonexistent Person",
				},
				mockOutput,
			);

			expect(result).toBeNull();
		});

		it("should handle AppleScript errors", async () => {
			const mockManager = new MockContactsManager({
				getResult: null,
			});
			const tool = createGetContact(mockManager);

			const result = await tool.run({ contactName: "John Doe" }, mockOutput);

			expect(result).toBeNull();
		});

		it("should handle contact with empty organization field", async () => {
			const mockContact: Contact = {
				id: "id1",
				name: "Jane Smith",
				emails: ["jane@example.com"],
				phones: ["555-9999"],
				organization: "missing value",
				birthday: undefined,
			};

			const mockManager = new MockContactsManager({
				getResult: mockContact,
			});
			const tool = createGetContact(mockManager);

			const result = await tool.run({ contactName: "Jane Smith" }, mockOutput);

			expect(result).toEqual(mockContact);
		});
	});

	describe("tool metadata", () => {
		it("searchContacts should have correct name", () => {
			expect(searchContacts.tool.name).toBe("searchContacts");
		});

		it("createContact should have correct name", () => {
			expect(createContact.tool.name).toBe("createContact");
		});

		it("listContacts should have correct name", () => {
			expect(listContacts.tool.name).toBe("listContacts");
		});

		it("getContact should have correct name", () => {
			expect(getContact.tool.name).toBe("getContact");
		});
	});
});
