import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	listCalendars,
	listEvents,
	searchEvents,
	createEvent,
	deleteEvent,
	getTodayEvents,
	getEventDetails,
	type CalendarEvent,
	type EventDetail,
} from "../appleCalendarTool.js";
import * as cp from "node:child_process";

// Mock child_process
vi.mock("node:child_process", () => ({
	exec: vi.fn(),
}));

describe("appleCalendarTool", () => {
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
		describe("listCalendars", () => {
			it("should validate empty input", () => {
				const input = {};
				const result = listCalendars.input.safeParse(input);
				expect(result.success).toBe(true);
			});
		});

		describe("listEvents", () => {
			it("should validate input with all parameters", () => {
				const input = { calendarName: "Work", days: 7 };
				const result = listEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input with only calendarName", () => {
				const input = { calendarName: "Work" };
				const result = listEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input with only days", () => {
				const input = { days: 7 };
				const result = listEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate empty input", () => {
				const input = {};
				const result = listEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject non-number days", () => {
				const input = { days: "seven" };
				const result = listEvents.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("searchEvents", () => {
			it("should validate input with all parameters", () => {
				const input = { query: "meeting", calendarName: "Work", days: 90 };
				const result = searchEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input with only query", () => {
				const input = { query: "meeting" };
				const result = searchEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing query", () => {
				const input = { calendarName: "Work" };
				const result = searchEvents.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("createEvent", () => {
			it("should validate input with all parameters", () => {
				const input = {
					calendarName: "Work",
					title: "Meeting",
					startDate: "12/25/2024 10:00:00",
					endDate: "12/25/2024 11:00:00",
					description: "Team meeting",
				};
				const result = createEvent.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should validate input without description", () => {
				const input = {
					calendarName: "Work",
					title: "Meeting",
					startDate: "12/25/2024 10:00:00",
					endDate: "12/25/2024 11:00:00",
				};
				const result = createEvent.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing required fields", () => {
				const input = { title: "Meeting" };
				const result = createEvent.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("deleteEvent", () => {
			it("should validate correct input", () => {
				const input = { calendarName: "Work", eventTitle: "Meeting" };
				const result = deleteEvent.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing calendarName", () => {
				const input = { eventTitle: "Meeting" };
				const result = deleteEvent.input.safeParse(input);
				expect(result.success).toBe(false);
			});

			it("should reject missing eventTitle", () => {
				const input = { calendarName: "Work" };
				const result = deleteEvent.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});

		describe("getTodayEvents", () => {
			it("should validate empty input", () => {
				const input = {};
				const result = getTodayEvents.input.safeParse(input);
				expect(result.success).toBe(true);
			});
		});

		describe("getEventDetails", () => {
			it("should validate correct input", () => {
				const input = { calendarName: "Work", eventTitle: "Meeting" };
				const result = getEventDetails.input.safeParse(input);
				expect(result.success).toBe(true);
			});

			it("should reject missing fields", () => {
				const input = { calendarName: "Work" };
				const result = getEventDetails.input.safeParse(input);
				expect(result.success).toBe(false);
			});
		});
	});

	describe("listCalendars", () => {
		it("should list all calendars", async () => {
			const mockOutput = "Work, Personal, Family";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listCalendars.run({});

			expect(result).toEqual(["Work", "Personal", "Family"]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 3 calendar(s).");
		});

		it("should return null when no calendars found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listCalendars.run({});

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

			const result = await listCalendars.run({});

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("listEvents", () => {
		it("should list events with default parameters", async () => {
			const mockOutput =
				"Team Meeting|||Monday, January 1, 2024 at 10:00:00 AM|||Monday, January 1, 2024 at 11:00:00 AM|||nance.nick@gmail.com:::Lunch|||Monday, January 1, 2024 at 12:00:00 PM|||Monday, January 1, 2024 at 1:00:00 PM|||nance.nick@gmail.com";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listEvents.run({});

			expect(result).toEqual([
				{
					summary: "Team Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "nance.nick@gmail.com",
				},
				{
					summary: "Lunch",
					startDate: "Monday, January 1, 2024 at 12:00:00 PM",
					endDate: "Monday, January 1, 2024 at 1:00:00 PM",
					calendar: "nance.nick@gmail.com",
				},
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 event(s).");
		});

		it("should list events with custom calendar and days", async () => {
			const mockOutput =
				"Meeting|||Monday, January 1, 2024 at 10:00:00 AM|||Monday, January 1, 2024 at 11:00:00 AM|||Work";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listEvents.run({ calendarName: "Work", days: 14 });

			expect(result).toEqual([
				{
					summary: "Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "Work",
				},
			]);
		});

		it("should return null when no events found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await listEvents.run({});

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

			const result = await listEvents.run({});

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("searchEvents", () => {
		it("should search events with query", async () => {
			const mockOutput =
				"Team Meeting|||Monday, January 1, 2024 at 10:00:00 AM|||Monday, January 1, 2024 at 11:00:00 AM|||nance.nick@gmail.com";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchEvents.run({ query: "Team" });

			expect(result).toEqual([
				{
					summary: "Team Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "nance.nick@gmail.com",
				},
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 1 event(s).");
		});

		it("should search with custom calendar and days", async () => {
			const mockOutput =
				"Meeting|||Monday, January 1, 2024 at 10:00:00 AM|||Monday, January 1, 2024 at 11:00:00 AM|||Work";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchEvents.run({
				query: "Meeting",
				calendarName: "Work",
				days: 30,
			});

			expect(result).toEqual([
				{
					summary: "Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "Work",
				},
			]);
		});

		it("should return null when no events found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await searchEvents.run({ query: "nonexistent" });

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

			const result = await searchEvents.run({ query: "test" });

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("createEvent", () => {
		it("should create event with all parameters", async () => {
			const mockOutput = "Event created: Team Meeting";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createEvent.run({
				calendarName: "Work",
				title: "Team Meeting",
				startDate: "12/25/2024 10:00:00",
				endDate: "12/25/2024 11:00:00",
				description: "Weekly team sync",
			});

			expect(result).toBe("Event created: Team Meeting");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should create event without description", async () => {
			const mockOutput = "Event created: Meeting";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await createEvent.run({
				calendarName: "Work",
				title: "Meeting",
				startDate: "12/25/2024 10:00:00",
				endDate: "12/25/2024 11:00:00",
			});

			expect(result).toBe("Event created: Meeting");
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

			const result = await createEvent.run({
				calendarName: "Work",
				title: "Meeting",
				startDate: "12/25/2024 10:00:00",
				endDate: "12/25/2024 11:00:00",
			});

			expect(result).toBe("Error creating event");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("deleteEvent", () => {
		it("should delete event successfully", async () => {
			const mockOutput = "Event deleted: Team Meeting";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await deleteEvent.run({
				calendarName: "Work",
				eventTitle: "Team Meeting",
			});

			expect(result).toBe("Event deleted: Team Meeting");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should return not found message", async () => {
			const mockOutput = "Event not found: Nonexistent Meeting";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await deleteEvent.run({
				calendarName: "Work",
				eventTitle: "Nonexistent Meeting",
			});

			expect(result).toBe("Event not found: Nonexistent Meeting");
		});

		it("should return error message when deletion fails", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(
					new Error("Deletion failed"),
					{ stdout: "", stderr: "" } as any,
					"",
				);
				return {} as any;
			});

			const result = await deleteEvent.run({
				calendarName: "Work",
				eventTitle: "Meeting",
			});

			expect(result).toBe("Error deleting event");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("getTodayEvents", () => {
		it("should get today's events", async () => {
			const mockOutput =
				"Morning Meeting|||Monday, January 1, 2024 at 9:00:00 AM|||Monday, January 1, 2024 at 10:00:00 AM|||nance.nick@gmail.com:::Lunch|||Monday, January 1, 2024 at 12:00:00 PM|||Monday, January 1, 2024 at 1:00:00 PM|||nance.nick@gmail.com";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getTodayEvents.run({});

			expect(result).toEqual([
				{
					summary: "Morning Meeting",
					startDate: "Monday, January 1, 2024 at 9:00:00 AM",
					endDate: "Monday, January 1, 2024 at 10:00:00 AM",
					calendar: "nance.nick@gmail.com",
				},
				{
					summary: "Lunch",
					startDate: "Monday, January 1, 2024 at 12:00:00 PM",
					endDate: "Monday, January 1, 2024 at 1:00:00 PM",
					calendar: "nance.nick@gmail.com",
				},
			]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 event(s) for today.");
		});

		it("should return null when no events today", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getTodayEvents.run({});

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

			const result = await getTodayEvents.run({});

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("getEventDetails", () => {
		it("should get event details", async () => {
			const mockOutput =
				"Team Meeting|||Monday, January 1, 2024 at 10:00:00 AM|||Monday, January 1, 2024 at 11:00:00 AM|||Work|||Weekly team sync|||Conference Room A|||https://example.com/meeting";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getEventDetails.run({
				calendarName: "Work",
				eventTitle: "Team Meeting",
			});

			expect(result).toEqual({
				summary: "Team Meeting",
				startDate: "Monday, January 1, 2024 at 10:00:00 AM",
				endDate: "Monday, January 1, 2024 at 11:00:00 AM",
				calendar: "Work",
				description: "Weekly team sync",
				location: "Conference Room A",
				url: "https://example.com/meeting",
			});
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should handle event with empty optional fields", async () => {
			// Format: summary|||startDate|||endDate|||calendar|||description|||location|||url (7 fields, 6 delimiters)
			const mockOutput =
				"Meeting|||Monday, January 1, 2024 at 10:00:00 AM|||Monday, January 1, 2024 at 11:00:00 AM|||Work||||||";
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: mockOutput, stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getEventDetails.run({
				calendarName: "Work",
				eventTitle: "Meeting",
			});

			expect(result).toEqual({
				summary: "Meeting",
				startDate: "Monday, January 1, 2024 at 10:00:00 AM",
				endDate: "Monday, January 1, 2024 at 11:00:00 AM",
				calendar: "Work",
				description: "",
				location: "",
				url: undefined,
			});
		});

		it("should return null when event not found", async () => {
			vi.mocked(cp.exec).mockImplementation((cmd, callback) => {
				callback?.(null, { stdout: "", stderr: "" } as any, "");
				return {} as any;
			});

			const result = await getEventDetails.run({
				calendarName: "Work",
				eventTitle: "Nonexistent Meeting",
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

			const result = await getEventDetails.run({
				calendarName: "Work",
				eventTitle: "Meeting",
			});

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe("tool metadata", () => {
		it("listCalendars should have correct name", () => {
			expect(listCalendars.tool.name).toBe("listCalendars");
		});

		it("listEvents should have correct name", () => {
			expect(listEvents.tool.name).toBe("listEvents");
		});

		it("searchEvents should have correct name", () => {
			expect(searchEvents.tool.name).toBe("searchEvents");
		});

		it("createEvent should have correct name", () => {
			expect(createEvent.tool.name).toBe("createEvent");
		});

		it("deleteEvent should have correct name", () => {
			expect(deleteEvent.tool.name).toBe("deleteEvent");
		});

		it("getTodayEvents should have correct name", () => {
			expect(getTodayEvents.tool.name).toBe("getTodayEvents");
		});

		it("getEventDetails should have correct name", () => {
			expect(getEventDetails.tool.name).toBe("getEventDetails");
		});
	});
});
