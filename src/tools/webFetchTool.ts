import type { PlainTool } from "./types.js";

/**
 * Configuration for the web fetch tool loaded from environment variables.
 */
interface WebFetchConfig {
	maxUses?: number;
	allowedDomains?: string[];
	blockedDomains?: string[];
	citations?: {
		enabled: boolean;
	};
	maxContentTokens?: number;
}

/**
 * Loads web fetch configuration from environment variables.
 *
 * Supported environment variables:
 * - WEB_FETCH_MAX_USES: Maximum number of fetches per request
 * - WEB_FETCH_ALLOWED_DOMAINS: Comma-separated list of allowed domains
 * - WEB_FETCH_BLOCKED_DOMAINS: Comma-separated list of blocked domains
 * - WEB_FETCH_ENABLE_CITATIONS: Enable source attribution (true/false)
 * - WEB_FETCH_MAX_CONTENT_TOKENS: Maximum content size in tokens
 */
function loadWebFetchConfig(): WebFetchConfig {
	const config: WebFetchConfig = {};

	// Parse max uses
	if (process.env.WEB_FETCH_MAX_USES) {
		const maxUses = Number.parseInt(process.env.WEB_FETCH_MAX_USES, 10);
		if (!Number.isNaN(maxUses) && maxUses > 0) {
			config.maxUses = maxUses;
		}
	}

	// Parse allowed domains (comma-separated)
	if (process.env.WEB_FETCH_ALLOWED_DOMAINS) {
		config.allowedDomains = process.env.WEB_FETCH_ALLOWED_DOMAINS.split(",")
			.map((d) => d.trim())
			.filter((d) => d.length > 0);
	}

	// Parse blocked domains (comma-separated)
	if (process.env.WEB_FETCH_BLOCKED_DOMAINS) {
		config.blockedDomains = process.env.WEB_FETCH_BLOCKED_DOMAINS.split(",")
			.map((d) => d.trim())
			.filter((d) => d.length > 0);
	}

	// Parse citations setting
	if (process.env.WEB_FETCH_ENABLE_CITATIONS) {
		const enabled =
			process.env.WEB_FETCH_ENABLE_CITATIONS.toLowerCase() === "true";
		if (enabled) {
			config.citations = { enabled: true };
		}
	}

	// Parse max content tokens
	if (process.env.WEB_FETCH_MAX_CONTENT_TOKENS) {
		const maxTokens = Number.parseInt(
			process.env.WEB_FETCH_MAX_CONTENT_TOKENS,
			10,
		);
		if (!Number.isNaN(maxTokens) && maxTokens > 0) {
			config.maxContentTokens = maxTokens;
		}
	}

	return config;
}

/**
 * Web fetch tool definition for Claude's native web fetch capability.
 *
 * This tool is executed by Claude's API (not locally). The API fetches full text
 * content from URLs and automatically extracts text from PDFs.
 *
 * Cost: No additional charges beyond standard token costs for fetched content.
 * Typical usage: ~2,500 tokens per 10KB page, ~125,000 tokens per 500KB PDF.
 *
 * Configuration is loaded from environment variables. See loadWebFetchConfig() for details.
 *
 * IMPORTANT: Requires beta header: anthropic-beta: web-fetch-2025-09-10
 */
export const webFetchTool: PlainTool = (() => {
	const config = loadWebFetchConfig();

	return {
		tool: {
			type: "web_fetch_20250910",
			name: "web_fetch",
			...(config.maxUses && { max_uses: config.maxUses }),
			...(config.allowedDomains &&
				config.allowedDomains.length > 0 && {
					allowed_domains: config.allowedDomains,
				}),
			...(config.blockedDomains &&
				config.blockedDomains.length > 0 && {
					blocked_domains: config.blockedDomains,
				}),
			...(config.citations && { citations: config.citations }),
			...(config.maxContentTokens && {
				max_content_tokens: config.maxContentTokens,
			}),
		} as any, // Type assertion needed for beta tool types not yet in SDK
	};
})();
