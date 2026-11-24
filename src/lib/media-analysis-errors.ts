export const mediaAnalysisCodes = [
  'invalid_response',
  'invalid_cache',
  'content_rejected',
  'provider_busy',
  'timeout',
  'storage_failure',
  'analysis_failed',
  'unauthorized',
] as const;
export type MediaAnalysisCode = (typeof mediaAnalysisCodes)[number];
export type MediaRecovery = 'retry' | 'replace' | 'sign_in';
export function isMediaAnalysisCode(value: unknown): value is MediaAnalysisCode {
  return typeof value === 'string' && (mediaAnalysisCodes as readonly string[]).includes(value);
}
export function mediaRecovery(code: MediaAnalysisCode): MediaRecovery {
  return code === 'content_rejected' || code === 'invalid_cache'
    ? 'replace'
    : code === 'unauthorized'
      ? 'sign_in'
      : 'retry';
}
export class MediaAnalysisError extends Error {
  constructor(public readonly code: MediaAnalysisCode) {
    super(code);
  }
}
