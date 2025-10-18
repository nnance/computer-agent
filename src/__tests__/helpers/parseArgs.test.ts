import { describe, expect, it } from "vitest";
import { parseArgs } from "../../helpers/parseArgs.js";

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

	it("should parse --format flag with json value", () => {
		const result = parseArgs(["--format", "json"]);
		expect(result.format).toBe("json");
	});

	it("should parse --format flag with text value", () => {
		const result = parseArgs(["--format", "text"]);
		expect(result.format).toBe("text");
	});

	it("should default format to text", () => {
		const result = parseArgs([]);
		expect(result.format).toBe("text");
	});

	it("should throw error when --format has invalid value", () => {
		expect(() => parseArgs(["--format", "invalid"])).toThrow(
			"--format must be either 'json' or 'text'",
		);
	});

	it("should throw error when --format has no value", () => {
		expect(() => parseArgs(["--format"])).toThrow(
			"--format requires a format argument",
		);
	});

	it("should parse -v flag", () => {
		const result = parseArgs(["-v"]);
		expect(result.verbose).toBe(true);
	});

	it("should parse --verbose flag", () => {
		const result = parseArgs(["--verbose"]);
		expect(result.verbose).toBe(true);
	});

	it("should parse -q flag", () => {
		const result = parseArgs(["-q"]);
		expect(result.verbose).toBe(false);
	});

	it("should parse --quiet flag", () => {
		const result = parseArgs(["--quiet"]);
		expect(result.verbose).toBe(false);
	});

	it("should default verbose to false", () => {
		const result = parseArgs([]);
		expect(result.verbose).toBe(false);
	});

	it("should handle multiple flags together", () => {
		const result = parseArgs([
			"-m",
			"test message",
			"--format",
			"json",
			"--verbose",
		]);
		expect(result.message).toBe("test message");
		expect(result.format).toBe("json");
		expect(result.verbose).toBe(true);
	});

	it("should handle quiet overriding verbose", () => {
		const result = parseArgs(["--verbose", "--quiet"]);
		expect(result.verbose).toBe(false);
	});
});
