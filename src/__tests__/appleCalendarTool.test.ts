import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	createListCalendars,
	createListEvents,
	createSearchEvents,
	createCreateEvent,
	createDeleteEvent,
	createGetTodayEvents,
	createGetEventDetails,
	listCalendars,
	listEvents,
	searchEvents,
	createEvent,
	deleteEvent,
	getTodayEvents,
	getEventDetails,
	CalendarManager,
	type CalendarEvent,
	type EventDetail,
} from "../appleCalendarTool.js";

// Mock CalendarManager for testing
class MockCalendarManager extends CalendarManager {
	private mockData: {
		calendars?: string[] | null;
		events?: CalendarEvent[] | null;
		searchResults?: CalendarEvent[] | null;
		createResult?: string | null;
		deleteResult?: string | null;
		todayEvents?: CalendarEvent[] | null;
		eventDetails?: EventDetail | null;
	};

	constructor(mockData = {}) {
		super();
		this.mockData = mockData;
	}

	async listCalendars(): Promise<string[] | null> {
		return this.mockData.calendars ?? null;
	}

	async listEvents(
		_calendarName?: string,
		_days?: number,
	): Promise<CalendarEvent[] | null> {
		return this.mockData.events ?? null;
	}

	async searchEvents(
		_query: string,
		_calendarName?: string,
		_days?: number,
	): Promise<CalendarEvent[] | null> {
		return this.mockData.searchResults ?? null;
	}

	async createEvent(
		_calendarName: string,
		_title: string,
		_startDate: string,
		_endDate: string,
		_description?: string,
	): Promise<string | null> {
		return this.mockData.createResult ?? null;
	}

	async deleteEvent(
		_calendarName: string,
		_eventTitle: string,
	): Promise<string | null> {
		return this.mockData.deleteResult ?? null;
	}

	async getTodayEvents(): Promise<CalendarEvent[] | null> {
		return this.mockData.todayEvents ?? null;
	}

	async getEventDetails(
		_calendarName: string,
		_eventTitle: string,
	): Promise<EventDetail | null> {
		return this.mockData.eventDetails ?? null;
	}
}

describe("appleCalendarTool", () => {
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
			const mockManager = new MockCalendarManager({
				calendars: ["Work", "Personal", "Family"],
			});
			const tool = createListCalendars(mockManager);

			const result = await tool.run({});

			expect(result).toEqual(["Work", "Personal", "Family"]);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 3 calendar(s).");
		});

		it("should return null when no calendars found", async () => {
			const mockManager = new MockCalendarManager({
				calendars: null,
			});
			const tool = createListCalendars(mockManager);

			const result = await tool.run({});

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("listEvents", () => {
		it("should list events with default parameters", async () => {
			const mockEvents: CalendarEvent[] = [
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
			];
			const mockManager = new MockCalendarManager({
				events: mockEvents,
			});
			const tool = createListEvents(mockManager);

			const result = await tool.run({});

			expect(result).toEqual(mockEvents);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 event(s).");
		});

		it("should list events with custom calendar and days", async () => {
			const mockEvents: CalendarEvent[] = [
				{
					summary: "Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "Work",
				},
			];
			const mockManager = new MockCalendarManager({
				events: mockEvents,
			});
			const tool = createListEvents(mockManager);

			const result = await tool.run({ calendarName: "Work", days: 14 });

			expect(result).toEqual(mockEvents);
		});

		it("should return null when no events found", async () => {
			const mockManager = new MockCalendarManager({
				events: null,
			});
			const tool = createListEvents(mockManager);

			const result = await tool.run({});

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("searchEvents", () => {
		it("should search events with query", async () => {
			const mockEvents: CalendarEvent[] = [
				{
					summary: "Team Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "nance.nick@gmail.com",
				},
			];
			const mockManager = new MockCalendarManager({
				searchResults: mockEvents,
			});
			const tool = createSearchEvents(mockManager);

			const result = await tool.run({ query: "Team" });

			expect(result).toEqual(mockEvents);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 1 event(s).");
		});

		it("should search with custom calendar and days", async () => {
			const mockEvents: CalendarEvent[] = [
				{
					summary: "Meeting",
					startDate: "Monday, January 1, 2024 at 10:00:00 AM",
					endDate: "Monday, January 1, 2024 at 11:00:00 AM",
					calendar: "Work",
				},
			];
			const mockManager = new MockCalendarManager({
				searchResults: mockEvents,
			});
			const tool = createSearchEvents(mockManager);

			const result = await tool.run({
				query: "Meeting",
				calendarName: "Work",
				days: 30,
			});

			expect(result).toEqual(mockEvents);
		});

		it("should return null when no events found", async () => {
			const mockManager = new MockCalendarManager({
				searchResults: null,
			});
			const tool = createSearchEvents(mockManager);

			const result = await tool.run({ query: "nonexistent" });

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("createEvent", () => {
		it("should create event with all parameters", async () => {
			const mockManager = new MockCalendarManager({
				createResult: "Event created: Team Meeting",
			});
			const tool = createCreateEvent(mockManager);

			const result = await tool.run({
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
			const mockManager = new MockCalendarManager({
				createResult: "Event created: Meeting",
			});
			const tool = createCreateEvent(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				title: "Meeting",
				startDate: "12/25/2024 10:00:00",
				endDate: "12/25/2024 11:00:00",
			});

			expect(result).toBe("Event created: Meeting");
		});

		it("should return error message when creation fails", async () => {
			const mockManager = new MockCalendarManager({
				createResult: null,
			});
			const tool = createCreateEvent(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				title: "Meeting",
				startDate: "12/25/2024 10:00:00",
				endDate: "12/25/2024 11:00:00",
			});

			expect(result).toBe("Error creating event");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("deleteEvent", () => {
		it("should delete event successfully", async () => {
			const mockManager = new MockCalendarManager({
				deleteResult: "Event deleted: Team Meeting",
			});
			const tool = createDeleteEvent(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				eventTitle: "Team Meeting",
			});

			expect(result).toBe("Event deleted: Team Meeting");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should return not found message", async () => {
			const mockManager = new MockCalendarManager({
				deleteResult: "Event not found: Nonexistent Meeting",
			});
			const tool = createDeleteEvent(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				eventTitle: "Nonexistent Meeting",
			});

			expect(result).toBe("Event not found: Nonexistent Meeting");
		});

		it("should return error message when deletion fails", async () => {
			const mockManager = new MockCalendarManager({
				deleteResult: null,
			});
			const tool = createDeleteEvent(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				eventTitle: "Meeting",
			});

			expect(result).toBe("Error deleting event");
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("getTodayEvents", () => {
		it("should get today's events", async () => {
			const mockEvents: CalendarEvent[] = [
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
			];
			const mockManager = new MockCalendarManager({
				todayEvents: mockEvents,
			});
			const tool = createGetTodayEvents(mockManager);

			const result = await tool.run({});

			expect(result).toEqual(mockEvents);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
			expect(consoleLogSpy).toHaveBeenCalledWith("Found 2 event(s) for today.");
		});

		it("should return null when no events today", async () => {
			const mockManager = new MockCalendarManager({
				todayEvents: null,
			});
			const tool = createGetTodayEvents(mockManager);

			const result = await tool.run({});

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
		});
	});

	describe("getEventDetails", () => {
		it("should get event details", async () => {
			const mockDetails: EventDetail = {
				summary: "Team Meeting",
				startDate: "Monday, January 1, 2024 at 10:00:00 AM",
				endDate: "Monday, January 1, 2024 at 11:00:00 AM",
				calendar: "Work",
				description: "Weekly team sync",
				location: "Conference Room A",
				url: "https://example.com/meeting",
			};
			const mockManager = new MockCalendarManager({
				eventDetails: mockDetails,
			});
			const tool = createGetEventDetails(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				eventTitle: "Team Meeting",
			});

			expect(result).toEqual(mockDetails);
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✓ Success");
		});

		it("should handle event with empty optional fields", async () => {
			const mockDetails: EventDetail = {
				summary: "Meeting",
				startDate: "Monday, January 1, 2024 at 10:00:00 AM",
				endDate: "Monday, January 1, 2024 at 11:00:00 AM",
				calendar: "Work",
				description: "",
				location: "",
				url: "",
			};
			const mockManager = new MockCalendarManager({
				eventDetails: mockDetails,
			});
			const tool = createGetEventDetails(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				eventTitle: "Meeting",
			});

			expect(result).toEqual(mockDetails);
		});

		it("should return null when event not found", async () => {
			const mockManager = new MockCalendarManager({
				eventDetails: null,
			});
			const tool = createGetEventDetails(mockManager);

			const result = await tool.run({
				calendarName: "Work",
				eventTitle: "Nonexistent Meeting",
			});

			expect(result).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledWith("Result: ✗ Failed");
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
