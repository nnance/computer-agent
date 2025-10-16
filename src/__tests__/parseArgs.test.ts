import { describe, expect, it } from "vitest";
import { parseArgs } from "../parseArgs.js";

describe("parseArgs", () => {
	it("should parse -h flag", () => {
		const result = parseArgs(["-h"]);
		expect(result.help).toBe(true);
		expect(result.message).toBeUndefined();
	});

	it("should parse --help flag", () => {
		const result = parseArgs(["--help"]);
		expect(result.help).toBe(true);
		expect(result.message).toBeUndefined();
	});

	it("should parse -m flag with message", () => {
		const result = parseArgs(["-m", "Hello world"]);
		expect(result.help).toBe(false);
		expect(result.message).toBe("Hello world");
	});

	it("should parse --message flag with message", () => {
		const result = parseArgs(["--message", "Hello world"]);
		expect(result.help).toBe(false);
		expect(result.message).toBe("Hello world");
	});

	it("should parse positional message argument", () => {
		const result = parseArgs(["Hello world"]);
		expect(result.help).toBe(false);
		expect(result.message).toBe("Hello world");
	});

	it("should return no message when no args provided", () => {
		const result = parseArgs([]);
		expect(result.help).toBe(false);
		expect(result.message).toBeUndefined();
	});

	it("should throw error when -m has no message", () => {
		expect(() => parseArgs(["-m"])).toThrow("-m requires a message argument");
	});

	it("should throw error when --message has no message", () => {
		expect(() => parseArgs(["--message"])).toThrow(
			"--message requires a message argument",
		);
	});

	it("should prioritize -m over positional argument", () => {
		const result = parseArgs(["-m", "From flag", "Positional"]);
		expect(result.message).toBe("From flag");
	});

	it("should handle help flag with other arguments", () => {
		const result = parseArgs(["-h", "-m", "test"]);
		expect(result.help).toBe(true);
		expect(result.message).toBe("test");
	});
});
