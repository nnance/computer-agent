import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { RunnableTool } from "./types.js";

// Load and validate required environment variable
const DEFAULT_CALENDAR_NAME = process.env.APPLE_CALENDAR_NAME;
if (!DEFAULT_CALENDAR_NAME) {
	throw new Error(
		"APPLE_CALENDAR_NAME environment variable is required. Please set it in your .env file.",
	);
}

export interface CalendarEvent {
	summary: string;
	startDate: string;
	endDate: string;
	calendar: string;
}

export interface EventDetail extends CalendarEvent {
	description: string;
	location: string;
	url: string;
}

export class CalendarManager {
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

	async listCalendars(): Promise<string[] | null> {
		const script = `
      tell application "Calendar"
        set calendarList to {}
        repeat with c in calendars
          set end of calendarList to name of c
        end repeat
        return calendarList
      end tell
    `;

		const result = await this.executeAppleScript(script);
		// return as array
		if (result) {
			return result.split(", ");
		}
		return null;
	}

	async listEvents(
		calendarName = DEFAULT_CALENDAR_NAME,
		days = 7,
	): Promise<CalendarEvent[] | null> {
		const script = `
      tell application "Calendar"
        set startDate to (current date)
        set targetDate to startDate + (${days} * days)
        set eventList to ""
        tell calendar "${calendarName}"
          set filteredEvents to (events whose start date ≥ startDate and start date ≤ targetDate)
          repeat with e in filteredEvents
            if eventList is not "" then
              set eventList to eventList & ":::"
            end if
            set eventList to eventList & (summary of e) & "|||" & (start date of e as string) & "|||" & (end date of e as string) & "|||" & "${calendarName}"
          end repeat
        end tell
        return eventList
      end tell
    `;

		const result = await this.executeAppleScript(script);
		// return as array of events with properties: summary, startDate, endDate, calendar
		if (result) {
			const eventStrings = result.split(":::");
			const events: CalendarEvent[] = eventStrings.map((eventStr) => {
				const [summary, startDate, endDate, calendar] = eventStr.split("|||");
				return { summary, startDate, endDate, calendar } as CalendarEvent;
			});
			return events;
		}
		return null;
	}

	async searchEvents(
		query: string,
		calendarName = DEFAULT_CALENDAR_NAME,
		days = 90,
	): Promise<CalendarEvent[] | null> {
		const script = `
      tell application "Calendar"
        set searchResults to ""
        set startDate to (current date)
        set endDate to startDate + (${days} * days)
        tell calendar "${calendarName}"
          set filteredEvents to (events whose start date ≥ startDate and start date ≤ endDate)
          repeat with e in filteredEvents
            if (summary of e contains "${query}") or (description of e contains "${query}") then
              if searchResults is not "" then
                set searchResults to searchResults & ":::"
              end if
              set searchResults to searchResults & (summary of e) & "|||" & (start date of e as string) & "|||" & (end date of e as string) & "|||" & "${calendarName}"
            end if
          end repeat
        end tell
        return searchResults
      end tell
    `;

		const result = await this.executeAppleScript(script);
		if (result) {
			const eventStrings = result.split(":::");
			const events: CalendarEvent[] = eventStrings.map((eventStr) => {
				const [summary, startDate, endDate, calendar] = eventStr.split("|||");
				return { summary, startDate, endDate, calendar } as CalendarEvent;
			});
			return events;
		}
		return null;
	}

	async createEvent(
		calendarName: string,
		title: string,
		startDate: string,
		endDate: string,
		description = "",
	) {
		const script = `
      tell application "Calendar"
        tell calendar "${calendarName}"
          set newEvent to make new event with properties {summary:"${title}", start date:date "${startDate}", end date:date "${endDate}", description:"${description}"}
          return "Event created: ${title}"
        end tell
      end tell
    `;

		const result = await this.executeAppleScript(script);
		return result;
	}

	async deleteEvent(calendarName: string, eventTitle: string) {
		const script = `
      tell application "Calendar"
        tell calendar "${calendarName}"
          set deleted to false
          repeat with e in events
            if summary of e is "${eventTitle}" then
              delete e
              set deleted to true
              exit repeat
            end if
          end repeat
          if deleted then
            return "Event deleted: ${eventTitle}"
          else
            return "Event not found: ${eventTitle}"
          end if
        end tell
      end tell
    `;

		const result = await this.executeAppleScript(script);
		return result;
	}

	async getTodayEvents() {
		// Just use the optimized listEvents function with 1 day
		return this.listEvents(DEFAULT_CALENDAR_NAME, 1);
	}

	async getEventDetails(
		calendarName: string,
		eventTitle: string,
	): Promise<EventDetail | null> {
		const script = `
      tell application "Calendar"
        tell calendar "${calendarName}"
          repeat with e in events
            if summary of e is "${eventTitle}" then
              return (summary of e) & "|||" & (start date of e as string) & "|||" & (end date of e as string) & "|||" & "${calendarName}" & "|||" & (description of e) & "|||" & (location of e) & "|||" & (url of e)
            end if
          end repeat
          return ""
        end tell
      end tell
    `;

		const result = await this.executeAppleScript(script);
		if (result) {
			const [
				summary,
				startDate,
				endDate,
				calendar,
				description,
				location,
				url,
			] = result.split("|||");
			return {
				summary,
				startDate,
				endDate,
				calendar,
				description,
				location,
				url,
			} as EventDetail;
		}
		return null;
	}
}

// Runnable Tools

const ListCalendarsInputSchema = z.object({});
export type ListCalendarsInput = z.infer<typeof ListCalendarsInputSchema>;

export const createListCalendars = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<ListCalendarsInput, string[] | null> => ({
	tool: {
		name: "listCalendars",
		description: "List all available calendars in the Apple Calendar app.",
		input_schema: {
			type: "object",
			properties: {},
		},
	},
	input: ListCalendarsInputSchema,
	run: async () => {
		const result = await manager.listCalendars();
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No calendars found or error occurred.`);
		} else {
			console.log(`Found ${result.length} calendar(s).`);
		}
		return result;
	},
});

export const listCalendars = createListCalendars();

const ListEventsInputSchema = z.object({
	calendarName: z
		.string()
		.optional()
		.describe(
			"Name of the calendar to list events from (defaults to configured calendar)",
		),
	days: z
		.number()
		.optional()
		.describe("Number of days to look ahead (defaults to 7)"),
});
export type ListEventsInput = z.infer<typeof ListEventsInputSchema>;

export const createListEvents = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<ListEventsInput, CalendarEvent[] | null> => ({
	tool: {
		name: "listEvents",
		description:
			"List upcoming events from a specific calendar within a specified number of days.",
		input_schema: {
			type: "object",
			properties: {
				calendarName: { type: "string", nullable: true },
				days: { type: "number", nullable: true },
			},
		},
	},
	input: ListEventsInputSchema,
	run: async ({ calendarName, days } = {}) => {
		const result = await manager.listEvents(calendarName, days);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No events found or error occurred.`);
		} else {
			console.log(`Found ${result.length} event(s).`);
		}
		return result;
	},
});

export const listEvents = createListEvents();

const SearchEventsInputSchema = z.object({
	query: z
		.string()
		.describe("Search query to find events by title or description"),
	calendarName: z
		.string()
		.optional()
		.describe(
			"Name of the calendar to search in (defaults to configured calendar)",
		),
	days: z
		.number()
		.optional()
		.describe("Number of days to search ahead (defaults to 90)"),
});
export type SearchEventsInput = z.infer<typeof SearchEventsInputSchema>;

export const createSearchEvents = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<SearchEventsInput, CalendarEvent[] | null> => ({
	tool: {
		name: "searchEvents",
		description: "Search for events in a calendar by title or description.",
		input_schema: {
			type: "object",
			properties: {
				query: { type: "string" },
				calendarName: { type: "string", nullable: true },
				days: { type: "number", nullable: true },
			},
		},
	},
	input: SearchEventsInputSchema,
	run: async ({ query, calendarName, days }) => {
		const result = await manager.searchEvents(query, calendarName, days);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No events found or error occurred.`);
		} else {
			console.log(`Found ${result.length} event(s).`);
		}
		return result;
	},
});

export const searchEvents = createSearchEvents();

const CreateEventInputSchema = z.object({
	calendarName: z
		.string()
		.describe("Name of the calendar to create the event in"),
	title: z.string().describe("Title/summary of the event"),
	startDate: z
		.string()
		.describe("Start date of the event (format: MM/DD/YYYY HH:MM:SS)"),
	endDate: z
		.string()
		.describe("End date of the event (format: MM/DD/YYYY HH:MM:SS)"),
	description: z
		.string()
		.optional()
		.describe("Optional description of the event"),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const createCreateEvent = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<CreateEventInput, string> => ({
	tool: {
		name: "createEvent",
		description: "Create a new event in a specified calendar.",
		input_schema: {
			type: "object",
			properties: {
				calendarName: { type: "string" },
				title: { type: "string" },
				startDate: { type: "string" },
				endDate: { type: "string" },
				description: { type: "string", nullable: true },
			},
		},
	},
	input: CreateEventInputSchema,
	run: async ({ calendarName, title, startDate, endDate, description }) => {
		const result = await manager.createEvent(
			calendarName,
			title,
			startDate,
			endDate,
			description,
		);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error creating event.`);
			return "Error creating event";
		}
		return result;
	},
});

export const createEvent = createCreateEvent();

const DeleteEventInputSchema = z.object({
	calendarName: z
		.string()
		.describe("Name of the calendar containing the event"),
	eventTitle: z.string().describe("Title of the event to delete"),
});
export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;

export const createDeleteEvent = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<DeleteEventInput, string> => ({
	tool: {
		name: "deleteEvent",
		description: "Delete an event from a specified calendar by its title.",
		input_schema: {
			type: "object",
			properties: {
				calendarName: { type: "string" },
				eventTitle: { type: "string" },
			},
		},
	},
	input: DeleteEventInputSchema,
	run: async ({ calendarName, eventTitle }) => {
		const result = await manager.deleteEvent(calendarName, eventTitle);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error deleting event.`);
			return "Error deleting event";
		}
		return result;
	},
});

export const deleteEvent = createDeleteEvent();

const GetTodayEventsInputSchema = z.object({});
export type GetTodayEventsInput = z.infer<typeof GetTodayEventsInputSchema>;

export const createGetTodayEvents = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<GetTodayEventsInput, CalendarEvent[] | null> => ({
	tool: {
		name: "getTodayEvents",
		description: "Get all events for today from the default calendar.",
		input_schema: {
			type: "object",
			properties: {},
		},
	},
	input: GetTodayEventsInputSchema,
	run: async () => {
		const result = await manager.getTodayEvents();
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: No events found or error occurred.`);
		} else {
			console.log(`Found ${result.length} event(s) for today.`);
		}
		return result;
	},
});

export const getTodayEvents = createGetTodayEvents();

const GetEventDetailsInputSchema = z.object({
	calendarName: z
		.string()
		.describe("Name of the calendar containing the event"),
	eventTitle: z.string().describe("Title of the event to get details for"),
});
export type GetEventDetailsInput = z.infer<typeof GetEventDetailsInputSchema>;

export const createGetEventDetails = (
	manager: CalendarManager = new CalendarManager(),
): RunnableTool<GetEventDetailsInput, EventDetail | null> => ({
	tool: {
		name: "getEventDetails",
		description:
			"Get detailed information about a specific event including description, location, and URL.",
		input_schema: {
			type: "object",
			properties: {
				calendarName: { type: "string" },
				eventTitle: { type: "string" },
			},
		},
	},
	input: GetEventDetailsInputSchema,
	run: async ({ calendarName, eventTitle }) => {
		const result = await manager.getEventDetails(calendarName, eventTitle);
		console.log(`Result: ${result ? "✓ Success" : "✗ Failed"}`);
		if (!result) {
			console.log(`Error: Event not found or error occurred.`);
		}
		return result;
	},
});

export const getEventDetails = createGetEventDetails();

export const appleCalendarTools = [
	listCalendars,
	listEvents,
	searchEvents,
	createEvent,
	deleteEvent,
	getTodayEvents,
	getEventDetails,
];
