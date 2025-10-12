import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

async function main() {
	const anthropic = new Anthropic();

	const msg = await anthropic.messages.create({
		model: "claude-sonnet-4-5",
		max_tokens: 1000,
		messages: [
			{
				role: "user",
				content:
					"What should I search for to find the latest developments in renewable energy?",
			},
		],
	});
	console.log(msg);
}

main().catch(console.error);
