import { createLogger, format, transports } from 'winston';

export const surveyLogger = createLogger({
  defaultMeta: { service: 'mythoria-webapp', component: 'surveys' },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});
