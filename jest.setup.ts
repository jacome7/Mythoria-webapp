import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';

// Mock uuid before any imports
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234-5678-1234-567890abcdef',
}));

// Polyfill for packages relying on Node's global encoders
// Narrow global augmentation instead of using 'any'
(global as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
(global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
(globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
(globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
(globalThis as unknown as { ReadableStream: typeof globalThis.ReadableStream }).ReadableStream ??=
  ReadableStream as typeof globalThis.ReadableStream;
(
  globalThis as unknown as { TransformStream: typeof globalThis.TransformStream }
).TransformStream ??= TransformStream as typeof globalThis.TransformStream;
(globalThis as unknown as { WritableStream: typeof globalThis.WritableStream }).WritableStream ??=
  WritableStream as typeof globalThis.WritableStream;
// Loaded after encoders are installed because undici reads them during module initialization.
const {
  Request: EdgeRequest,
  Response: EdgeResponse,
  Headers: EdgeHeaders,
} = require('next/dist/compiled/@edge-runtime/primitives/fetch');
(globalThis as unknown as { Request: typeof Request }).Request ??= EdgeRequest as typeof Request;
(globalThis as unknown as { Response: typeof Response }).Response ??=
  EdgeResponse as typeof Response;
(globalThis as unknown as { Headers: typeof Headers }).Headers ??= EdgeHeaders as typeof Headers;

// Reduce noisy expected logs during tests while preserving real error output
const originalError: typeof console.error = console.error.bind(console);
console.error = (...args: unknown[]): void => {
  const first = String(args[0] ?? '');
  // Silence known expected messages from negative-path tests
  if (
    first.includes('Webhook signature verification failed') ||
    first.includes('Missing required parameters for signature verification') ||
    first.includes('REVOLUT_WEBHOOK_SECRET not found in environment variables')
  ) {
    return;
  }
  originalError(...(args as unknown[]));
};
