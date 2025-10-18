import { log, spinner } from "@clack/prompts";

/**
 * Output interface for different modes (interactive vs non-interactive)
 */
export interface OutputHandler {
	startThinking: () => void;
	stopThinking: (message: string) => void;
	startTool: (toolName: string) => void;
	stopTool: (toolName: string, success: boolean, message: string) => void;
	showMessage: (message: string) => void;
	showSuccess: (message: string) => void;
	showError: (message: string) => void;
}

/**
 * Creates an interactive output handler using @clack/prompts
 * Includes spinners and formatted output for better UX
 */
export function createInteractiveOutput(): OutputHandler {
	const indicator = spinner();

	return {
		startThinking: () => indicator.start("Thinking..."),
		stopThinking: (message: string) => indicator.stop(message),
		startTool: (toolName: string) => indicator.start(`Using tool: ${toolName}`),
		stopTool: (toolName: string, _success: boolean, message: string) =>
			indicator.stop(`Tool ${toolName}: ${message}`),
		showMessage: (message: string) => log.message(message),
		showSuccess: (message: string) => log.success(message),
		showError: (message: string) => log.error(message),
	};
}

/**
 * Creates a non-interactive output handler using plain console output
 * No spinners or special formatting - suitable for scripting and automation
 */
export function createNonInteractiveOutput(): OutputHandler {
	return {
		startThinking: () => {},
		stopThinking: () => {},
		startTool: () => {},
		stopTool: () => {},
		showMessage: (message: string) => console.log(message),
		showSuccess: (message: string) => console.log(message),
		showError: (message: string) => console.error(message),
	};
}
