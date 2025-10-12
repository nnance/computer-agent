import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, cancel, text, log, spinner } from "@clack/prompts";

async function main() {
	const anthropic = new Anthropic();

	let value = await text({
		message: "How can I help you?",
	});

	const messages: Anthropic.Messages.MessageParam[] = [];
	const indicator = spinner();

	while (!isCancel(value)) {
		if (isCancel(value)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		messages.push({ role: "user", content: value });

		indicator.start("Thinking...");

		// Call the Anthropic API
		const msg = await anthropic.messages.create({
			model: "claude-sonnet-4-5",
			max_tokens: 1000,
			messages,
		});
		messages.push({ role: "assistant", content: msg.content });
		indicator.stop();

		// Process the response
		for await (const block of msg.content) {
			if (block.type === "text") {
				log.message(block.text);
			} else if (block.type === "tool_use") {
				log.step(`Using tool: ${block.name}`);
			}
		}

		// Prompt for the next input
		value = await text({
			message: "How can I help you?",
		});
	}

	log.success("Goodbye!");
}

main();
