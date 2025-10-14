# Web Search Tool - Testing Guide

This document provides example prompts and testing scenarios for the web search tool implementation.

## Quick Start

1. **Start the application**:
   ```bash
   npm start
   ```

2. **Enter any of the prompts below** at the "How can I help you?" prompt

3. **Observe the behavior**:
   - You'll see "Using tool: web_search" in the spinner
   - Then "Tool web_search: Executed by API"
   - Claude will synthesize the search results into a natural response
   - The response will include citations/sources

## Example Prompts by Category

### 1. Current Events & News

Test Claude's ability to fetch recent news and developments:

```
What are the latest developments in AI this week?
```

```
What's happening with the 2024 US presidential election?
```

```
Tell me about recent breakthroughs in quantum computing.
```

```
What are the major tech announcements from CES 2025?
```

```
Has there been any major climate news recently?
```

### 2. Real-time Information

Test fetching current, time-sensitive data:

```
What's the current weather in San Francisco?
```

```
What's the latest stock price for AAPL?
```

```
What are today's top headlines?
```

```
What time is sunrise today in New York?
```

```
Is the stock market up or down today?
```

### 3. Recent Updates Beyond Knowledge Cutoff

Test information that may be newer than Claude's training data:

```
What are the new features in TypeScript 5.7?
```

```
What's new in the latest version of React?
```

```
Has SpaceX launched any rockets this month?
```

```
What's the latest version of Node.js and what are its new features?
```

```
Are there any new Anthropic models released recently?
```

### 4. Specific Facts & Statistics

Test factual lookups that may have changed:

```
What's the current population of Tokyo?
```

```
Who won the 2024 Super Bowl?
```

```
What's the exchange rate between USD and EUR today?
```

```
How many countries are in the United Nations now?
```

```
What's the current world record for the 100m sprint?
```

### 5. Product Information & Reviews

Test product research and comparisons:

```
What are the specs of the latest iPhone?
```

```
What do reviewers say about the M4 MacBook Pro?
```

```
Compare the best noise-cancelling headphones available now.
```

```
What are the top-rated air purifiers in 2025?
```

```
Find reviews for the Sony WH-1000XM5 headphones.
```

### 6. Technical Documentation

Test finding up-to-date technical resources:

```
Show me the latest Anthropic API documentation for web search.
```

```
What are the new features in Node.js 22?
```

```
Find the official TypeScript migration guide from JavaScript.
```

```
What are the breaking changes in React 19?
```

```
Look up the Vitest documentation for setup and configuration.
```

### 7. Local/Location-Based Queries

Test location-aware searches (requires location environment variables):

```
What are the best-rated restaurants near me?
```

```
What events are happening in San Francisco this weekend?
```

```
Find local bike shops in my area.
```

```
What's the closest coffee shop with WiFi?
```

```
Are there any farmers markets nearby today?
```

### 8. Comparative Research

Test Claude's ability to gather and compare information:

```
Compare Vitest vs Jest for testing in 2024.
```

```
What's better for beginners: Python or JavaScript?
```

```
Compare AWS vs Azure vs Google Cloud pricing for small startups.
```

```
Which is faster: Bun, Node.js, or Deno?
```

```
Compare electric cars: Tesla Model 3 vs Chevy Bolt vs Nissan Leaf.
```

### 9. Complex Multi-Step Queries

Test queries that may require multiple searches:

```
Compare the latest iPhone, Samsung Galaxy, and Google Pixel.
What are the pros and cons of each? Which is best for photography?
```

```
I'm planning a trip to Japan. What are the top tourist destinations,
best times to visit, and estimated costs for a 2-week trip?
```

```
Research TypeScript for me: what is it, why use it over JavaScript,
and what are the best resources for learning it?
```

```
Find the best laptop for software development under $2000.
Compare at least 3 options with specs and reviews.
```

## Testing with Configuration

### Test Domain Filtering - Allowed Domains

**Setup** - Create/edit `.env`:
```bash
# Only search from trusted educational and official sites
WEB_SEARCH_ALLOWED_DOMAINS=wikipedia.org,python.org,nodejs.org,mozilla.org
```

**Test Prompts**:
```
What is TypeScript?
```
```
Explain how async/await works in JavaScript.
```

Expected: Results should only come from allowed domains (Wikipedia, Python.org, Node.js, Mozilla).

### Test Domain Filtering - Blocked Domains

**Setup** - Create/edit `.env`:
```bash
# Block specific domains from results
WEB_SEARCH_BLOCKED_DOMAINS=reddit.com,quora.com,pinterest.com
```

**Test Prompts**:
```
What do people think about the M4 MacBook Pro?
```
```
How do I center a div in CSS?
```

Expected: No results from Reddit, Quora, or Pinterest should appear.

### Test Location Context

**Setup** - Create/edit `.env`:
```bash
WEB_SEARCH_USER_LOCATION_CITY=Boston
WEB_SEARCH_USER_LOCATION_REGION=Massachusetts
WEB_SEARCH_USER_LOCATION_COUNTRY=US
WEB_SEARCH_USER_LOCATION_TIMEZONE=America/New_York
```

**Test Prompts**:
```
What's the weather today?
```
Expected: Should return Boston weather, not generic weather.

```
Best pizza near me.
```
Expected: Should search Boston area pizza places.

```
What time is it?
```
Expected: Should provide Boston/Eastern time context.

### Test Max Uses Limit

**Setup** - Create/edit `.env`:
```bash
# Limit to 2 searches per request
WEB_SEARCH_MAX_USES=2
```

**Test Prompts**:
```
Research the top 5 programming languages in 2025, their use cases,
popularity trends, salary ranges, and learning curves.
```

Expected: Claude will be limited to 2 searches, so the response may be less comprehensive than without the limit.

```
Compare 10 different laptop brands with detailed specs and reviews.
```

Expected: Limited information due to search constraint.

## Expected Output Format

When you ask a question like "What are the latest TypeScript features?", you should see:

```
How can I help you? What are the latest TypeScript features?
⠋ Thinking...
✔ Tool use initiated.
⠋ Using tool: web_search
✔ Tool web_search: Executed by API
⠋ Thinking...
✔ Reached natural stopping point.

Based on recent information, TypeScript 5.6 (released in [date]) includes several
notable features:

1. **Disallowed Nullish and Truthy Checks** - Enhanced type checking for
   more reliable null/undefined handling...

2. **Iterator Helper Methods** - Support for new iterator methods like
   .map(), .filter(), and .reduce() on iterables...

3. **Arbitrary Module Identifiers** - Better module resolution with support
   for special characters in module names...

[Sources: typescript.org, github.com/microsoft/TypeScript, devblogs.microsoft.com]

How can I help you?
```

## Observing Tool Execution

### In the Terminal

You'll see these indicators during web search:
1. `⠋ Thinking...` - Claude is processing your request
2. `✔ Tool use initiated.` - Claude decided to use a tool
3. `⠋ Using tool: web_search` - Web search is being executed by the API
4. `✔ Tool web_search: Executed by API` - Search completed (note: no local execution)
5. `⠋ Thinking...` - Claude is synthesizing the results
6. `✔ Reached natural stopping point.` - Response is ready

### Multiple Searches

For complex queries, you may see:
```
⠋ Using tool: web_search
✔ Tool web_search: Executed by API
⠋ Using tool: web_search  (second search)
✔ Tool web_search: Executed by API
```

This indicates Claude performed multiple searches to gather comprehensive information.

## Cost Tracking

Each web search costs:
- **$0.01** per search ($10 per 1,000 searches)
- **Plus** standard token costs for the search-generated content in the response

To monitor costs:
1. Check the Anthropic Console for API usage
2. Count the number of "Using tool: web_search" messages in your session
3. Multiply by $0.01 for search costs
4. Add token costs from the API response

## Troubleshooting

### No Search Results

If Claude doesn't search when you expect it to:
- **Check prompt clarity**: Make the time-sensitivity or need for current info explicit
- **Example**: Instead of "Tell me about TypeScript", try "What's new in TypeScript in 2025?"

### Search Not Triggering

Try these more explicit prompts:
```
Search the web for [your topic]
```
```
Look up current information about [your topic]
```
```
Find the latest news on [your topic]
```

### Unexpected Results

If you get results from blocked domains:
- Verify your `.env` file is in the project root
- Restart the application (`npm start`) to reload environment variables
- Check that domain names are spelled correctly

### Limited Information

If responses seem incomplete:
- Check if `WEB_SEARCH_MAX_USES` is set too low
- Try more specific prompts
- Break complex queries into smaller, focused questions

## Testing Checklist

Use this checklist to verify web search functionality:

- [ ] Basic search works (test with a current events query)
- [ ] Citations/sources are included in responses
- [ ] Multiple searches work for complex queries
- [ ] Domain filtering (allowed_domains) works correctly
- [ ] Domain filtering (blocked_domains) works correctly
- [ ] Location context affects results appropriately
- [ ] Max uses limit is respected
- [ ] Tool execution shows "Executed by API" message
- [ ] No errors in terminal output
- [ ] Responses are natural and well-synthesized

## Advanced Testing

### Stress Testing

Test with rapid-fire queries:
```
1. What's the weather?
2. Latest AI news?
3. Current stock prices?
4. Today's headlines?
5. TypeScript updates?
```

Submit these quickly to test API rate limiting and response handling.

### Error Conditions

Test error handling:
- Invalid domain configuration (both allowed and blocked set)
- Very specific queries with no results
- Queries about content that may not exist

### Integration Testing

Test web search alongside other tools:
```
Search for the latest TypeScript features, then create a note
summarizing them.
```

```
Look up tomorrow's weather and add it to my calendar.
```

## Performance Benchmarks

Typical response times (approximate):
- **Simple query**: 2-5 seconds
- **Complex query (1 search)**: 3-7 seconds
- **Complex query (multiple searches)**: 5-15 seconds

Note: Times vary based on:
- Network latency
- Query complexity
- Number of searches performed
- API response time

## Best Practices

1. **Be Specific**: "Latest TypeScript 5.6 features" vs "TypeScript info"
2. **Indicate Time Sensitivity**: Use words like "latest", "current", "today", "recent"
3. **Use Location Context**: Set location env vars for local queries
4. **Monitor Costs**: Track searches for budget planning
5. **Test Incrementally**: Start simple, then add complexity

## Additional Resources

- [Claude Web Search Documentation](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)
- [Project Planning Document](planning/web-search-tool.md)
- [Environment Configuration](.env.example)
- [Implementation Details](CLAUDE.md#web-search-tool)
