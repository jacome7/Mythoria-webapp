import { createLogger, format, transports } from 'winston';

export const referralLogger = createLogger({
  defaultMeta: { service: 'mythoria-webapp', component: 'referrals' },
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});
