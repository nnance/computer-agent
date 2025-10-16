import type { PlainTool } from "./types.js";

/**
 * Configuration for the web search tool loaded from environment variables.
 */
interface WebSearchConfig {
	maxUses?: number;
	allowedDomains?: string[];
	blockedDomains?: string[];
	userLocation?: {
		type: "approximate";
		city?: string;
		region?: string;
		country?: string;
		timezone?: string;
	};
}

/**
 * Loads web search configuration from environment variables.
 *
 * Supported environment variables:
 * - WEB_SEARCH_MAX_USES: Maximum number of searches per request
 * - WEB_SEARCH_ALLOWED_DOMAINS: Comma-separated list of allowed domains
 * - WEB_SEARCH_BLOCKED_DOMAINS: Comma-separated list of blocked domains
 * - WEB_SEARCH_USER_LOCATION_CITY: User's city for location context
 * - WEB_SEARCH_USER_LOCATION_REGION: User's region/state
 * - WEB_SEARCH_USER_LOCATION_COUNTRY: User's country code (e.g., "US")
 * - WEB_SEARCH_USER_LOCATION_TIMEZONE: User's timezone (e.g., "America/Los_Angeles")
 */
function loadWebSearchConfig(): WebSearchConfig {
	const config: WebSearchConfig = {};

	// Parse max uses
	if (process.env.WEB_SEARCH_MAX_USES) {
		const maxUses = Number.parseInt(process.env.WEB_SEARCH_MAX_USES, 10);
		if (!Number.isNaN(maxUses) && maxUses > 0) {
			config.maxUses = maxUses;
		}
	}

	// Parse allowed domains (comma-separated)
	if (process.env.WEB_SEARCH_ALLOWED_DOMAINS) {
		config.allowedDomains = process.env.WEB_SEARCH_ALLOWED_DOMAINS.split(",")
			.map((d) => d.trim())
			.filter((d) => d.length > 0);
	}

	// Parse blocked domains (comma-separated)
	if (process.env.WEB_SEARCH_BLOCKED_DOMAINS) {
		config.blockedDomains = process.env.WEB_SEARCH_BLOCKED_DOMAINS.split(",")
			.map((d) => d.trim())
			.filter((d) => d.length > 0);
	}

	// Build user location if any location fields are provided
	const city = process.env.WEB_SEARCH_USER_LOCATION_CITY;
	const region = process.env.WEB_SEARCH_USER_LOCATION_REGION;
	const country = process.env.WEB_SEARCH_USER_LOCATION_COUNTRY;
	const timezone = process.env.WEB_SEARCH_USER_LOCATION_TIMEZONE;

	if (city || region || country || timezone) {
		config.userLocation = {
			type: "approximate",
			...(city && { city }),
			...(region && { region }),
			...(country && { country }),
			...(timezone && { timezone }),
		};
	}

	return config;
}

/**
 * Web search tool definition for Claude's native web search capability.
 *
 * This tool is executed by Claude's API (not locally). The API performs web searches
 * and returns results as BetaWebSearchToolResultBlock content blocks.
 *
 * Cost: $10 per 1,000 searches (plus standard token costs for search-generated content).
 *
 * Configuration is loaded from environment variables. See loadWebSearchConfig() for details.
 */
export const webSearchTool: PlainTool = (() => {
	const config = loadWebSearchConfig();

	return {
		tool: {
			type: "web_search_20250305",
			name: "web_search",
			...(config.maxUses && { max_uses: config.maxUses }),
			...(config.allowedDomains &&
				config.allowedDomains.length > 0 && {
					allowed_domains: config.allowedDomains,
				}),
			...(config.blockedDomains &&
				config.blockedDomains.length > 0 && {
					blocked_domains: config.blockedDomains,
				}),
			...(config.userLocation && { user_location: config.userLocation }),
		},
	};
})();
