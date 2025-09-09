import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for packages relying on Node's global encoders
// Narrow global augmentation instead of using 'any'
(global as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
(global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;

// Reduce noisy expected logs during tests while preserving real error output
const originalError: typeof console.error = console.error.bind(console);
console.error = (...args: unknown[]): void => {
	const first = String(args[0] ?? "");
	// Silence known expected messages from negative-path tests
	if (
		first.includes("Webhook signature verification failed") ||
		first.includes("Missing required parameters for signature verification") ||
		first.includes("REVOLUT_WEBHOOK_SECRET not found in environment variables")
	) {
		return;
	}
	originalError(...(args as unknown[]));
};
