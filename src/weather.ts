import { z } from "zod";
import type { RunnableTool } from "./types.js";

const GetWeatherInputSchema = z.object({
	location: z
		.string()
		.describe("The location to get the weather for, e.g., 'San Francisco, CA'"),
});

export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

export const getWeather: RunnableTool<GetWeatherInput, string> = {
	tool: {
		name: "get_weather",
		description: "Get the weather for a specific location",
		input_schema: {
			type: "object",
			properties: { location: { type: "string" } },
		},
	},
	input: GetWeatherInputSchema,
	run: async ({ location }) => {
		return `The current weather in ${location} is sunny with a high of 75°F and a low of 55°F.`;
	},
};
