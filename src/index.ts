import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { isCancel, cancel, text, log, spinner } from "@clack/prompts";
import { getWeather } from "./weather.js";

const tools = [getWeather];

function stopReason(reason: Anthropic.Messages.StopReason | null): string {
	switch (reason) {
		case "max_tokens":
			return "Max tokens reached.";
		case "stop_sequence":
			return "Custom stop sequence encountered.";
		case "tool_use":
			return "Tool use initiated.";
		case "end_turn":
			return "Reached natural stopping point.";
		case "model_context_window_exceeded":
			return "Model context window exceeded.";
		case "pause_turn":
			return "Paused long-running turn.";
		case "refusal":
			return "Refusal to respond.";
		default:
			return "Unknown stop reason.";
	}
}

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
			tools: tools.map((t) => t.tool),
			max_tokens: 1024,
			messages,
		});
		messages.push({ role: "assistant", content: msg.content });
		indicator.stop(stopReason(msg.stop_reason));

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
