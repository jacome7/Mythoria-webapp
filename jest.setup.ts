import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for packages relying on Node's global encoders
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Reduce noisy expected logs during tests while preserving real error output
const originalError = console.error;
console.error = (...args: unknown[]) => {
	const first = String(args[0] ?? "");
	// Silence known expected messages from negative-path tests
	if (
		first.includes("Webhook signature verification failed") ||
		first.includes("Missing required parameters for signature verification") ||
		first.includes("REVOLUT_WEBHOOK_SECRET not found in environment variables")
	) {
		return;
	}
	originalError.apply(console, args as any);
};
