export type SurveyAdminErrorStatus = 400 | 401 | 403 | 404 | 409;

/** Domain error carrying the stable `code` and HTTP status returned by the internal survey API. */
export class SurveyAdminError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: SurveyAdminErrorStatus = 400,
  ) {
    super(message);
    this.name = 'SurveyAdminError';
  }
}
