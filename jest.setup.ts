import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for packages relying on Node's global encoders
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
