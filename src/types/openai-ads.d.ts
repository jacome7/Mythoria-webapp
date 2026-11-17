// Global typings for the OpenAI (ChatGPT Ads) Measurement Pixel queue (`oaiq`).

declare global {
  interface Window {
    oaiq?: ((...args: unknown[]) => void) & { q?: unknown[] };
    /** Set once `oaiq.min.js` has loaded (see `OAIQ_LOADED_EVENT`). */
    __mythoriaOaiqLoaded?: boolean;
  }
}

export {};
