import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	searchContacts,
	createContact,
	listContacts,
	getContact,
	type Contact,
} from "../appleContactsTool.js";
import * as cp from "node:child_process";

// Mock child_process
vi.mock("node:child_process", () => ({
	exec: vi.fn(),
}));

describe("appleContactsTool", () => {
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
			const mockOutput =
				"id1|||John Doe|||john@example.com,john.doe@work.com|||555-1234,555-5678|||Acme Corp|||January 15, 1990:::id2|||Jane Smith|||jane@example.com|||555-9999|||Tech Inc|||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchContacts.run({ query: "John" });

			expect(result).toEqual([
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
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 contact(s).");
		});

		it("should handle contact with no emails or phones", async () => {
			const mockOutput = "id1|||John Doe||||||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchContacts.run({ query: "John" });

			expect(result).toEqual([
				{
					id: "id1",
					name: "John Doe",
					emails: [],
					phones: [],
					organization: undefined,
					birthday: undefined,
				},
			]);
		});

		it("should return null when no contacts found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchContacts.run({ query: "nonexistent" });

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

			const result = await searchContacts.run({ query: "test" });

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it("should search by organization", async () => {
			const mockOutput =
				"id1|||John Doe|||john@example.com|||555-1234|||Acme Corp|||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchContacts.run({ query: "Acme" });

			expect(result).toEqual([
				{
					id: "id1",
					name: "John Doe",
					emails: ["john@example.com"],
					phones: ["555-1234"],
					organization: "Acme Corp",
					birthday: undefined,
				},
			]);
		});
	});

	describe("createContact", () => {
		it("should create contact with all parameters", async () => {
			const mockOutput = "Contact created: John Doe";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createContact.run({
				name: "John Doe",
				email: "john@example.com",
				phone: "555-1234",
				organization: "Acme Corp",
				birthday: "January 15, 1990",
			});

			expect(result).toBe("Contact created: John Doe");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should create contact with only name", async () => {
			const mockOutput = "Contact created: John Doe";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createContact.run({ name: "John Doe" });

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and email", async () => {
			const mockOutput = "Contact created: John Doe";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createContact.run({
				name: "John Doe",
				email: "john@example.com",
			});

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and phone", async () => {
			const mockOutput = "Contact created: John Doe";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createContact.run({
				name: "John Doe",
				phone: "555-1234",
			});

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and organization", async () => {
			const mockOutput = "Contact created: John Doe";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createContact.run({
				name: "John Doe",
				organization: "Acme Corp",
			});

			expect(result).toBe("Contact created: John Doe");
		});

		it("should create contact with name and birthday", async () => {
			const mockOutput = "Contact created: John Doe";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createContact.run({
				name: "John Doe",
				birthday: "January 15, 1990",
			});

			expect(result).toBe("Contact created: John Doe");
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

			const result = await createContact.run({ name: "John Doe" });

			expect(result).toBe("Error creating contact");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("listContacts", () => {
		it("should list all contacts", async () => {
			// Format: id|||name|||emails|||phones|||organization|||birthday (6 fields, 5 delimiters)
			const mockOutput =
				"id1|||John Doe|||john@example.com|||555-1234|||Acme Corp|||January 15, 1990:::id2|||Jane Smith|||jane@example.com|||555-9999|||Tech Inc|||:::id3|||Bob Johnson||||||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listContacts.run({});

			expect(result).toEqual([
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
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 3 contact(s).");
		});

		it("should handle contacts with multiple emails and phones", async () => {
			const mockOutput =
				"id1|||John Doe|||john@example.com,john.doe@work.com,john.personal@mail.com|||555-1234,555-5678,555-0000|||Acme Corp|||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listContacts.run({});

			expect(result).toEqual([
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
			]);
		});

		it("should return null when no contacts found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listContacts.run({});

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

			const result = await listContacts.run({});

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("getContact", () => {
		it("should get contact by name", async () => {
			const mockOutput =
				"id1|||John Doe|||john@example.com,john.doe@work.com|||555-1234,555-5678|||Acme Corp|||January 15, 1990";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getContact.run({ contactName: "John Doe" });

			expect(result).toEqual({
				id: "id1",
				name: "John Doe",
				emails: ["john@example.com", "john.doe@work.com"],
				phones: ["555-1234", "555-5678"],
				organization: "Acme Corp",
				birthday: "January 15, 1990",
			});
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should get contact with minimal information", async () => {
			const mockOutput = "id1|||John Doe||||||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getContact.run({ contactName: "John Doe" });

			expect(result).toEqual({
				id: "id1",
				name: "John Doe",
				emails: [],
				phones: [],
				organization: undefined,
				birthday: undefined,
			});
		});

		it("should return null when contact not found", async () => {
			const mockOutput = "Contact not found: Nonexistent Person";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getContact.run({
				contactName: "Nonexistent Person",
			});

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

			const result = await getContact.run({ contactName: "John Doe" });

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it("should handle contact with empty organization field", async () => {
			const mockOutput =
				"id1|||Jane Smith|||jane@example.com|||555-9999|||missing value|||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getContact.run({ contactName: "Jane Smith" });

			expect(result).toEqual({
				id: "id1",
				name: "Jane Smith",
				emails: ["jane@example.com"],
				phones: ["555-9999"],
				organization: "missing value",
				birthday: undefined,
			});
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
