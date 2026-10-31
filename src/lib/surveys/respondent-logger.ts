import { createLogger, format, transports } from 'winston';

/** Structured logger for the anonymous respondent flow. Never log tokens, answers or free text. */
export const surveyRespondentLogger = createLogger({
  defaultMeta: { service: 'mythoria-webapp', component: 'survey-respondent' },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});
