import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Enable global test APIs (describe, it, expect, etc.)
		globals: true,

		// Test environment (node for CLI tools)
		environment: "node",

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"**/*.config.ts",
				"**/*.d.ts",
				"**/types.ts",
			],
		},

		// Include patterns
		include: ["**/*.{test,spec}.{js,ts}"],

		// Exclude patterns
		exclude: ["node_modules", "dist", ".git"],

		// Test timeout
		testTimeout: 10000,
	},
});
